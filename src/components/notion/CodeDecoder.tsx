"use client";
import React, { useState } from "react";
import { codeToToken } from "@/service/notion";

function CodeDecoder({ onCode }: { onCode?: (code: string) => void }) {
  const [loading, setLoading] = useState<boolean>(false);
  const [code, setCode] = useState("");
  return (
    <div className="flex flex-row gap-4 items-center justify-center">
      <input
        type="text"
        className="w-60 input input-bordered"
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />
      <button
        className="btn"
        onClick={() => {
          setLoading(true);
          codeToToken(code)
            .then((token) => {
              onCode?.(token);
            })
            .finally(() => {
              setLoading(false);
            });
        }}
        disabled={!code || loading}
      >
        {loading ? "deciding" : "decode"}
      </button>
    </div>
  );
}

export default CodeDecoder;
