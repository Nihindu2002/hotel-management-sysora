interface PlaceholderPageProps {
  title: string;
}

export default function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-xs">
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      <p className="mt-2 text-sm text-gray-500">
        This section is ready and will be connected to backend APIs in upcoming steps.
      </p>
    </div>
  );
}

