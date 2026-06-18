export function HiddenJson({ value }: { value: unknown }) {
  let json: string;
  try {
    json = JSON.stringify(value, null, 2);
  } catch (err) {
    json = `// could not stringify: ${
      err instanceof Error ? err.message : String(err)
    }`;
  }
  return (
    <div className="hidden" data-event-json>
      {json}
    </div>
  );
}
