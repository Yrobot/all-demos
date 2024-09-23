"use client";
import Auth from "@/components/notion/Auth";
import CodeDecoder from "@/components/notion/CodeDecoder";
import PageList from "@/components/notion/PageList";
import RootPage from "@/components/notion/RootPage";
import RootPageBox from "@/components/notion/RootPageBox";
import RootDBBox from "@/components/notion/RootDBBox";
import { TOKEN_LOCAL_KEY } from "@/libs/notion";
import { useLocalStorageState } from "@/libs/hooks";

export default function Page() {
  const [token, setToken] = useLocalStorageState<string>(TOKEN_LOCAL_KEY);
  const [rootId, setRootId] = useLocalStorageState<string>("");
  return (
    <div className="flex justify-center flex-col items-center min-h-screen gap-4">
      <Auth>Get Notion Code</Auth>
      <CodeDecoder onCode={setToken} />
      <p>
        <span className="opacity-60 mr-1">TOKEN:</span>
        <span>{token ?? "null"}</span>
      </p>
      {token && (
        <>
          <RootPage token={token} onRootId={setRootId} />
          {rootId && (
            <div className="max-w-[1440px] mx-auto grid grid-cols-3 gap-8">
              <PageList token={token} />
              <RootPageBox token={token} />
              <RootDBBox token={token} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
