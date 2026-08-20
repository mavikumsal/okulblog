export function validateSeoFields(input: { title: string; description: string; slug: string; canonical?: string }, origin?: string) {
  const errors: Record<string, string> = {};
  if (!input.title.trim()) errors.title = "SEO başlığı boş bırakılamaz.";
  else if (input.title.trim().length > 60) errors.title = "SEO başlığı 60 karakteri aşmamalıdır.";
  if (!input.description.trim()) errors.description = "SEO açıklaması boş bırakılamaz.";
  else if (input.description.trim().length > 160) errors.description = "SEO açıklaması 160 karakteri aşmamalıdır.";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug.trim())) errors.slug = "Slug yalnızca küçük harf, rakam ve tire içermelidir.";
  if (input.canonical && !/^https?:\/\//i.test(input.canonical.trim())) errors.canonical = "Canonical URL http:// veya https:// ile başlamalıdır.";
  if (origin && input.canonical && !input.canonical.startsWith(origin.replace(/\/$/, ""))) errors.canonical = "Canonical URL sitenin güvenilir alan adıyla başlamalıdır.";
  return { valid: Object.keys(errors).length === 0, errors };
}
