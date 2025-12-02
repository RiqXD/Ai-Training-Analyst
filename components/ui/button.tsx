import { ButtonHTMLAttributes, DetailedHTMLProps } from "react";
export function Button(props: DetailedHTMLProps<ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement> & { variant?: string; size?: string }) {
  const { className = "", ...rest } = props;
  return <button className={`btn ${className}`} {...rest} />;
}
