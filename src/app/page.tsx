import { ErrorBoundary } from "@/components/error-boundary";
import { Observatory } from "@/components/observatory";

export default function Home() {
  return (
    <ErrorBoundary>
      <Observatory />
    </ErrorBoundary>
  );
}
