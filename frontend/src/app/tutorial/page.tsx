import { redirect } from "next/navigation";

export default function TutorialPage() {
  redirect("/simulate?mode=tutorial&map=moonCity");
}
