import { Suspense } from "react";
import SearchResults from "@/components/SearchResults";

// useSearchParams를 쓰는 클라이언트 컴포넌트는 Suspense 경계 필요
export default function SearchPage() {
  return (
    <Suspense>
      <SearchResults />
    </Suspense>
  );
}
