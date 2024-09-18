"use client";
import Auth from "@/components/notion/Auth";
import CodeDecoder from "@/components/notion/CodeDecoder";
import { TOKEN_LOCAL_KEY } from "@/libs/notion";
import { useLocalStorageState } from "@/libs/hooks";

export default function Page() {
  const [token, setToken] = useLocalStorageState<string>(TOKEN_LOCAL_KEY);
  return (
    <div className="flex justify-center flex-col items-center min-h-screen gap-4">
      <Auth>Get Notion Code</Auth>
      <CodeDecoder onCode={setToken} />
      <p>
        <span className="opacity-60 mr-1">TOKEN:</span>
        <span>{token ?? "null"}</span>
      </p>
    </div>
  );
}
