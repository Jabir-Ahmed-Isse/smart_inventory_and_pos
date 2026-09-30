import { redirect } from "next/navigation";

// Superseded by HR → Attendance (daily attendance + hours per employee).
export default function Page() {
  redirect("/hr/attendance");
}
