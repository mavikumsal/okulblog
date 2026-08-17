import { useEffect, useMemo, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock3, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function TestRunner() {
  const [, params] = useRoute("/test/:id");
  const [, setLocation] = useLocation();
  const testId = Number(params?.id);
  const tests = trpc.tests.list.useQuery(undefined, { enabled: Number.isInteger(testId) && testId > 0 });
  const questions = trpc.questions.list.useQuery(undefined, { enabled: Number.isInteger(testId) && testId > 0 });
  const submit = trpc.member.submitAttempt.useMutation();
  const progress = trpc.member.progress.useMutation();
  const test = tests.data?.find(item => item.id === testId);
  const testQuestions = useMemo(() => {
    const ids = Array.isArray(test?.questionIds) ? test.questionIds.map(Number) : [];
    return ids.map(id => questions.data?.find(question => question.id === id)).filter(Boolean) as NonNullable<typeof questions.data>[number][];
  }, [test?.questionIds, questions.data]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{ correct: number; wrong: number; blank: number; score: number } | null>(null);
  const durationSeconds = Math.max(60, (test?.durationMinutes ?? 20) * 60);

  useEffect(() => {
    if (test && !submitted) setSecondsLeft(durationSeconds);
  }, [test?.id, durationSeconds, submitted]);

  useEffect(() => {
    if (!test || submitted || secondsLeft <= 0) return;
    const timer = window.setInterval(() => setSecondsLeft(value => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [test, submitted, secondsLeft]);

  useEffect(() => {
    if (test && !submitted && secondsLeft === 0 && testQuestions.length) finishTest();
  }, [secondsLeft, testQuestions.length, submitted]);

  const finishTest = () => {
    if (!test || submitted) return;
    let correct = 0;
    let wrong = 0;
    let blank = 0;
    testQuestions.forEach(question => {
      const selected = answers[question.id];
      if (!selected) blank += 1;
      else if (selected === question.answer) correct += 1;
      else wrong += 1;
    });
    const score = testQuestions.length ? Math.round((correct / testQuestions.length) * 100) : 0;
    const summary = { correct, wrong, blank, score };
    setResult(summary);
    setSubmitted(true);
    submit.mutate({ testId, correctCount: correct, wrongCount: wrong, blankCount: blank, score, durationSeconds: durationSeconds - secondsLeft });
    progress.mutate({ contentType: "test", contentId: testId, status: "completed" });
  };

  if (tests.isLoading || questions.isLoading) return <div className="container py-16 text-[#365368]">Test hazırlanıyor...</div>;
  if (!test) return <div className="container py-16"><p className="text-[#71838b]">Test bulunamadı.</p><Button className="mt-4" onClick={() => setLocation("/")}><ArrowLeft size={16} /> Ana sayfaya dön</Button></div>;
  const minutes = Math.floor(secondsLeft / 60).toString().padStart(2, "0");
  const seconds = (secondsLeft % 60).toString().padStart(2, "0");

  return <main className="min-h-screen bg-[#f7f4ed] py-10 text-[#17354d]"><div className="container max-w-4xl"><div className="mb-6 flex flex-wrap items-center justify-between gap-4"><div><button onClick={() => setLocation("/")} className="mb-3 inline-flex items-center gap-2 text-sm font-bold text-[#6b8586]"><ArrowLeft size={15} /> Geri dön</button><h1 className="text-3xl font-bold tracking-[-.05em]">{test.title}</h1><p className="mt-2 text-sm text-[#71838b]">{test.description || "Soruları cevaplayın ve sonucu gönderin."}</p></div><Badge className={`gap-2 border-0 px-4 py-2 text-base ${secondsLeft < 60 ? "bg-[#f3c7bd] text-[#873d31]" : "bg-[#dcece6] text-[#28685c]"}`}><Clock3 size={17} /> {submitted ? "Tamamlandı" : `${minutes}:${seconds}`}</Badge></div>{submitted && result ? <section className="rounded-[26px] bg-[#18344f] p-8 text-white"><CheckCircle2 size={30} className="text-[#f2c866]" /><h2 className="mt-4 text-2xl font-bold">Test sonucu</h2><div className="mt-6 grid gap-3 sm:grid-cols-4">{[["Doğru", result.correct], ["Yanlış", result.wrong], ["Boş", result.blank], ["Puan", result.score]].map(([label, value]) => <div key={label} className="rounded-2xl bg-white/10 p-4"><p className="text-xs text-[#c8d4d6]">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></div>)}</div><Button onClick={() => setLocation("/panel/uye-paneli")} className="mt-7 bg-[#f2c866] text-[#17354d] hover:bg-[#f7d982]">Üye Panelimde sonuçlarımı gör</Button></section> : <div className="space-y-5">{testQuestions.map((question, index) => <section key={question.id} className="rounded-[24px] border border-[#e3e5dc] bg-white p-6"><p className="text-xs font-bold tracking-[.14em] text-[#78918b] uppercase">Soru {index + 1}</p><h2 className="mt-3 text-lg font-bold leading-7">{question.prompt}</h2><div className="mt-5 grid gap-2">{(Array.isArray(question.options) ? question.options : []).map(option => <label key={option} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm ${answers[question.id] === option ? "border-[#6c9e93] bg-[#e8f2ed]" : "border-[#e8ebe3]"}`}><input type="radio" name={`question-${question.id}`} checked={answers[question.id] === option} onChange={() => setAnswers(current => ({ ...current, [question.id]: option }))} />{option}</label>)}</div></section>)}<Button disabled={!testQuestions.length || submit.isPending} onClick={finishTest} className="w-full rounded-xl bg-[#18344f] py-6 text-base">{submit.isPending ? "Sonuç kaydediliyor..." : "Testi tamamla"}</Button></div>}</div></main>;
}
