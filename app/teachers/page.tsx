import dynamic from "next/dynamic";

const TeacherDashboard = dynamic(() => import("../../components/TeacherDashboard"), { ssr: false });

export default function Page() {
  return <TeacherDashboard />;
}
