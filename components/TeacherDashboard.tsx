"use client";

import React, { useMemo, useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Brain, TrendingUp, TrendingDown, Info } from "lucide-react";

/* ===============================
   📊 TYPE DEFINITIONS
================================= */
type Teacher = {
  id: number;
  nama: string;
  mata_pelajaran: string;
  pengalaman_mengajar: string;
  penilaian_kehadiran: number;
  penilaian_siswa: number;
  feedback: any;
};

/* ===============================
   ⚙️  UTILS
================================= */
function averageScore(t: Teacher) {
  return Math.round((t.penilaian_kehadiran + t.penilaian_siswa) / 2);
}

function computeStatus(avg: number): { label: string; tone: "low" | "mid" | "high" } {
  if (avg < 70) return { label: "Perlu perhatian", tone: "low" };
  if (avg <= 80) return { label: "Sedang", tone: "mid" };
  return { label: "Tinggi", tone: "high" };
}

function toneBadge(tone: "low" | "mid" | "high") {
  switch (tone) {
    case "low":
      return "bg-red-100 text-red-700 border border-red-200";
    case "mid":
      return "bg-amber-100 text-amber-700 border border-amber-200";
    case "high":
      return "bg-emerald-100 text-emerald-700 border border-emerald-200";
  }
}

/* ===============================
   🤖 OPENROUTER LLM CONFIG
================================= */
const OPENROUTER_MODEL = "deepseek/deepseek-chat-v3.1";

function makeOpenRouterBody(t: Teacher) {
  const avg = averageScore(t);
  const status = computeStatus(avg).label;
  const sys = `Anda adalah ahli evaluasi pendidikan yang menulis analisis layaknya manusia.
Gunakan bahasa Indonesia yang alami, sopan, dan komunikatif.
Tugas Anda adalah membaca data guru, menilai performa, dan menjelaskan analisis secara menyeluruh — bukan hanya satu kalimat.
Fokus pada:
- kekuatan guru
- area yang bisa ditingkatkan
- insight dari kritik & saran siswa
- rekomendasi nyata yang dapat dilakukan guru

Hindari bahasa robot, buat mengalir seperti manusia.`;
  const user = {
    instruction:
      "Berdasarkan data guru + kritik saran siswa, buat analisis lengkap yang terdengar manusiawi. Jelaskan perilaku mengajar, kualitas interaksi, dan rekomendasi perbaikan. Jangan terlalu singkat.",
    teacher: {
      nama: t.nama,
      mapel: t.mata_pelajaran,
      pengalaman_mengajar: t.pengalaman_mengajar,
      kehadiran: t.penilaian_kehadiran,
      penilaian_siswa: t.penilaian_siswa,
      rataRata: avg,
      status,
    },
    feedback: t.feedback,
    output_format:
      "Keluarkan hanya JSON valid tanpa teks lain, dengan format: { \"analysis\": string, \"sentiments\": { \"positive\": number, \"neutral\": number, \"negative\": number } }",
    language: "id-ID",
  };
  return {
    model: OPENROUTER_MODEL,
    temperature: 0.2,
    messages: [
      { role: "system", content: sys },
      { role: "user", content: JSON.stringify(user) },
    ],
    response_format: { type: "json_object" },
  };
}

async function analyzeWithOpenRouter(t: Teacher) {
  const body = makeOpenRouterBody(t);
  const r = await fetch("/api/ai-analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error("AI analyze failed");
  const j = await r.json();
  const content = j.choices?.[0]?.message?.content || "{}";
  return JSON.parse(content);
}

/* ===============================
   🧠 MAIN DASHBOARD COMPONENT
================================= */
export default function TeacherDashboard() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selected, setSelected] = useState<Teacher | null>(null);
  const [open, setOpen] = useState(false);
  const [aiText, setAiText] = useState<string>("");
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiSentiments, setAiSentiments] = useState<{ positive: number; neutral: number; negative: number } | null>(null);

  /* ---------------------------
     🔹 FETCH TEACHERS FROM SUPABASE
  ---------------------------- */
  useEffect(() => {
    const fetchTeachers = async () => {
      const { data, error } = await supabase.from("teachers").select("*");
      if (error) console.error("Error fetching teachers:", error);
      else setTeachers(data || []);
    };
    fetchTeachers();
  }, []);

  /* ---------------------------
     🔹 CALCULATE STATUS + TOP/BOTTOM
  ---------------------------- */
  const enriched = useMemo(() => {
    return teachers.map((t) => {
      const avg = averageScore(t);
      const status = computeStatus(avg);
      return { ...t, avg, status };
    });
  }, [teachers]);

  const top3 = useMemo(() =>
    [...enriched].sort((a, b) => b.avg - a.avg).slice(0, 3).map((t) => ({ name: t.nama.split(" ")[0], skor: t.avg })),
  [enriched]);

  const bottom3 = useMemo(() =>
    [...enriched].sort((a, b) => a.avg - b.avg).slice(0, 3).map((t) => ({ name: t.nama.split(" ")[0], skor: t.avg })),
  [enriched]);

  /* ---------------------------
     🔹 HANDLE DETAIL CLICK + AI SAVE
  ---------------------------- */
  const handleDetail = async (t: Teacher) => {
    setSelected(t);
    setOpen(true);

    // Jika sudah ada hasil feedback dari Supabase, tampilkan tanpa analisis ulang
    if (t.feedback?.analysis) {
      setAiText(t.feedback.analysis);
      setAiSentiments(t.feedback.sentiments);
      return;
    }

    // Jika belum ada, jalankan AI dan simpan hasil ke Supabase
    setLoadingAI(true);
    setAiSentiments(null);

    try {
      const { analysis, sentiments } = await analyzeWithOpenRouter(t);
      setAiText(analysis);
      setAiSentiments(sentiments);

      // Simpan hasil ke kolom feedback (JSONB)
      const feedbackData = { analysis, sentiments, originalFeedback: t.feedback };
      await supabase.from("teachers").update({ feedback: feedbackData }).eq("id", t.id);
    } catch (e) {
      console.error(e);
      const fallback = `Analisis sementara untuk ${t.nama} (${t.mata_pelajaran}). Rata-rata ${averageScore(t)}.`;
      setAiText(fallback);
    } finally {
      setLoadingAI(false);
    }
  };

  /* ---------------------------
     🔹 SENTIMENT CHART DATA
  ---------------------------- */
  const donutData = useMemo(() => {
    if (!aiSentiments) return [
      { name: "Positive", value: 0 },
      { name: "Neutral", value: 0 },
      { name: "Negative", value: 0 },
    ];
    return [
      { name: "Positive", value: aiSentiments.positive || 0 },
      { name: "Neutral", value: aiSentiments.neutral || 0 },
      { name: "Negative", value: aiSentiments.negative || 0 },
    ];
  }, [aiSentiments]);

  /* ===============================
     🧩 UI RENDER
  ================================= */
  return (
    <div className="w-full space-y-6 p-4 md:p-6 lg:p-8">
      <div className="flex items-center gap-3">
        <Brain className="w-6 h-6" />
        <h1 className="text-2xl font-bold">Tabel Pengajar & Analitik AI</h1>
      </div>

      {/* 📋 TABLE SECTION */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Daftar Pengajar</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableCaption>Data real-time dari Supabase. Klik “Detail” untuk analisis AI.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Pengajar</TableHead>
                <TableHead>Mata Pelajaran</TableHead>
                <TableHead>Pengalaman</TableHead>
                <TableHead>Kehadiran</TableHead>
                <TableHead>Penilaian Siswa</TableHead>
                <TableHead>Status</TableHead>
                <TableHead><div className="text-right">Aksi</div></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enriched.map((t) => (
                <TableRow key={t.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium">{t.nama}</TableCell>
                  <TableCell>{t.mata_pelajaran}</TableCell>
                  <TableCell>{t.pengalaman_mengajar}</TableCell>
                  <TableCell>{t.penilaian_kehadiran}</TableCell>
                  <TableCell>{t.penilaian_siswa}</TableCell>
                  <TableCell>
                    <Badge className={toneBadge(t.status.tone)}>{t.status.label}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button onClick={() => handleDetail(t)}>Detail</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 📈 CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Top 3 Guru Terbaik
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full h-72">
              <ResponsiveContainer>
                <BarChart data={top3}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="skor" name="Skor Rata-rata" fill="#2563eb"/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4" /> Top 3 Nilai Terendah
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full h-72">
              <ResponsiveContainer>
                <BarChart data={bottom3}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="skor" name="Skor Rata-rata" fill="#dc2626"/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 🧠 AI ANALYSIS DIALOG */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="w-4 h-4" /> Analisis Pengajar (AI)
            </DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-4 p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 🔍 AI ANALYSIS TEXT */}
                <Card className="md:col-span-2">
                  <CardHeader className="pb-1">
                    <CardTitle className="text-base">Analisis AI</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm leading-relaxed">
                      {loadingAI ? (
                        <div className="animate-pulse text-gray-500">Menghasilkan analisis AI…</div>
                      ) : (
                        <p>{aiText}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* 📊 STATUS */}
                <Card>
                  <CardHeader className="pb-1">
                    <CardTitle className="text-base">Status & Skor</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span>Nama</span><span>{selected.nama}</span></div>
                      <div className="flex justify-between"><span>Mapel</span><span>{selected.mata_pelajaran}</span></div>
                      <div className="flex justify-between"><span>Kehadiran</span><span>{selected.penilaian_kehadiran}</span></div>
                      <div className="flex justify-between"><span>Penilaian</span><span>{selected.penilaian_siswa}</span></div>
                      <div className="flex justify-between"><span>Rata-rata</span><span>{averageScore(selected)}</span></div>
                      <div className="flex justify-between"><span>Status</span>
                        <Badge className={toneBadge(computeStatus(averageScore(selected)).tone)}>
                          {computeStatus(averageScore(selected)).label}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 🥧 SENTIMENT CHART + FEEDBACK */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                

                <Card className="md:col-span-3">
                  <CardHeader className="pb-1">
                    <CardTitle className="text-base">Umpan Balik Siswa</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-sm bg-gray-50 p-2 rounded">
                      {JSON.stringify(selected.feedback, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="text-xs text-gray-500">
        *Status: <b>Perlu perhatian</b> (&lt;70), <b>Sedang</b> (71–80), <b>Tinggi</b> (81–100)
      </div>
    </div>
  );
}
