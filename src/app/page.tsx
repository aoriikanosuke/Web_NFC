type SearchParams = Record<string, string | string[] | undefined>;

export const dynamic = "force-dynamic";

function buildQuery(searchParams?: SearchParams) {
  if (!searchParams) return "";
  const params = new URLSearchParams();
  Object.entries(searchParams).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((v) => {
        if (v) params.append(key, v);
      });
    } else if (value) {
      params.set(key, value);
    }
  });
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export default function Home({ searchParams }: { searchParams?: SearchParams }) {
  const query = buildQuery(searchParams);
  return (
    <iframe
      src={`/index.html${query}`}
      style={{
        width: "100%",
        height: "100vh",
        border: "none",
      }}
    />
  );
}
