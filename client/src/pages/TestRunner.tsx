import { useEffect, useMemo, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock3, ArrowLeft, CheckCircle2, CircleX, ListChecks, TimerReset } from "lucide-react";

export function calculateTestResult(questions: Array<{ id: number; answer: string | null }>, answers: Record<number, string>) {
  let correct = 0;
  let wrong = 0;
  let blank = 0;
  questions.forEach(question => {
    const selected = answers[question.id];
    if (!selected) blank += 1;
    else if (selected === question.answer) correct += 1;
    else wrong += 1;
  });
  return { correct, wrong, blank, score: questions.length ? Math.round((correct / questions.length) * 100) : 0 };
}

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
  const answeredCount = Object.keys(answers).length;
  const completionPercent = testQuestions.length ? Math.round((answeredCount / testQuestions.length) * 100) : 0;

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
    const summary = calculateTestResult(testQuestions, answers);
    setResult(summary);
    setSubmitted(true);
    submit.mutate({ testId, correctCount: summary.correct, wrongCount: summary.wrong, blankCount: summary.blank, score: summary.score, durationSeconds: durationSeconds - secondsLeft });
    progress.mutate({ contentType: "test", contentId: testId, status: "completed" });
  };

  if (tests.isLoading || questions.isLoading) return <div className="container py-16 text-[#365368]">Test hazırlanıyor...</div>;
  if (!test) return <div className="container py-16"><p className="text-[#71838b]">Test bulunamadı.</p><Button className="mt-4" onClick={() => setLocation("/")}><ArrowLeft size={16} /> Ana sayfaya dön</Button></div>;
  const minutes = Math.floor(secondsLeft / 60).toString().padStart(2, "0");
  const seconds = (secondsLeft % 60).toString().padStart(2, "0");

  return <main className="min-h-screen bg-[#f7f4ed] py-10 text-[#17354d]"><div className="container max-w-4xl"><div className="mb-6 flex flex-wrap items-center justify-between gap-4"><div><button onClick={() => setLocation("/")} className="mb-3 inline-flex items-center gap-2 text-sm font-bold text-[#6b8586]"><ArrowLeft size={15} /> Geri dön</button><h1 className="text-3xl font-bold tracking-[-.05em]">{test.title}</h1><p className="mt-2 text-sm text-[#71838b]">{test.description || "Soruları cevaplayın ve sonucu gönderin."}</p></div><Badge className={`gap-2 border-0 px-4 py-2 text-base ${secondsLeft < 60 ? "bg-[#f3c7bd] text-[#873d31]" : "bg-[#dcece6] text-[#28685c]"}`}><Clock3 size={17} /> {submitted ? "Tamamlandı" : `${minutes}:${seconds}`}</Badge></div>{submitted && result ? <div className="space-y-5"><section className="rounded-[26px] bg-[#18344f] p-8 text-white"><CheckCircle2 size={30} className="text-[#f2c866]" /><h2 className="mt-4 text-2xl font-bold">Test sonucu</h2><p className="mt-2 text-sm text-[#c8d4d6]">Cevaplarını gözden geçirerek hangi konularda tekrar yapman gerektiğini görebilirsin.</p><div className="mt-6 grid gap-3 sm:grid-cols-4">{[["Doğru", result.correct], ["Yanlış", result.wrong], ["Boş", result.blank], ["Başarı", `%${result.score}`]].map(([label, value]) => <div key={label} className="rounded-2xl bg-white/10 p-4"><p className="text-xs text-[#c8d4d6]">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></div>)}</div><Button onClick={() => setLocation("/panel/uye-paneli")} className="mt-7 bg-[#f2c866] text-[#17354d] hover:bg-[#f7d982]">Üye Panelimde sonuçlarımı gör</Button></section><section className="rounded-[26px] border border-[#e3e5dc] bg-white p-5 sm:p-7"><div className="flex items-center gap-2 text-sm font-black text-[#193f59]"><ListChecks size={17} className="text-[#b88735]" /> Soru bazlı analiz</div><div className="mt-4 space-y-3">{testQuestions.map((question, index) => { const selected = answers[question.id]; const isCorrect = selected === question.answer; return <article key={question.id} className={`rounded-2xl border p-4 ${isCorrect ? "border-[#b8dbc9] bg-[#f2faf5]" : selected ? "border-[#efc5bc] bg-[#fff7f4]" : "border-[#e4e8e2] bg-[#fafbf8]"}`}><div className="flex items-start gap-3"><div className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full ${isCorrect ? "bg-[#d9eee3] text-[#28725d]" : "bg-[#f5ddd8] text-[#a4514c]"}`}>{isCorrect ? <CheckCircle2 size={15} /> : <CircleX size={15} />}</div><div className="min-w-0"><p className="text-[11px] font-black uppercase tracking-[.12em] text-[#7b8c8e]">Soru {index + 1}</p><p className="mt-1 text-sm font-bold leading-6 text-[#29465a]">{question.prompt}</p><p className="mt-2 text-xs text-[#687b80]">Senin cevabın: <strong>{selected || "Boş"}</strong>{!isCorrect && question.answer ? <> · Doğru cevap: <strong className="text-[#28725d]">{question.answer}</strong></> : null}</p></div></div></article>; })}</div></section></div> : <div className="space-y-5"><section className="sticky top-3 z-10 rounded-2xl border border-[#e1e7df] bg-white/95 p-4 shadow-[0_12px_28px_rgba(23,53,77,.08)] backdrop-blur"><div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-[#526b71]"><span className="inline-flex items-center gap-2"><TimerReset size={15} className={secondsLeft < 60 ? "text-[#a4514c]" : "text-[#b88735]"} /> {answeredCount}/{testQuestions.length} soru cevaplandı</span><span>%{completionPercent} tamamlandı</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-[#edf0ea]"><div className="h-full rounded-full bg-[#b88735] transition-all" style={{ width: `${completionPercent}%` }} /></div></section>{testQuestions.map((question, index) => <section key={question.id} className="rounded-[24px] border border-[#e3e5dc] bg-white p-6"><p className="text-xs font-bold tracking-[.14em] text-[#78918b] uppercase">Soru {index + 1}</p><h2 className="mt-3 text-lg font-bold leading-7">{question.prompt}</h2><div className="mt-5 grid gap-2">{(Array.isArray(question.options) ? question.options : []).map(option => <label key={option} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm ${answers[question.id] === option ? "border-[#6c9e93] bg-[#e8f2ed]" : "border-[#e8ebe3]"}`}><input type="radio" name={`question-${question.id}`} checked={answers[question.id] === option} onChange={() => setAnswers(current => ({ ...current, [question.id]: option }))} />{option}</label>)}</div></section>)}<Button disabled={!testQuestions.length || submit.isPending} onClick={finishTest} className="w-full rounded-xl bg-[#18344f] py-6 text-base">{submit.isPending ? "Sonuç kaydediliyor..." : "Testi tamamla"}</Button></div>}</div></main>;
}
