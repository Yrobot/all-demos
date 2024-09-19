"use client";
import React, { useState, useEffect, useMemo } from "react";
import { getAllPages } from "@/service/notion";
import { useRequest } from "ahooks";

function PageList({ token }: { token: string }) {
  const [search, setSearch] = useState<string>("");
  const { data: pages = [], loading } = useRequest(
    async () =>
      getAllPages({
        token,
        search,
      }),
    {
      ready: !!token,
      refreshDeps: [search],
      debounceWait: 600,
    }
  );
  return (
    <div className="w-60">
      <input
        type="text"
        placeholder="Search the Page"
        className="input input-bordered w-full mb-4"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {loading && (
        <div className="flex items-center justify-center h-36">
          <span className="loading loading-bars loading-lg"></span>
        </div>
      )}
      {!loading && (
        <div className="flex flex-col items-start justify-start gap-2">
          <p className="opacity-60">Pages:</p>
          <ul>
            {pages.map(({ title, id }) => (
              <li className="" key={id}>
                - {title}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default PageList;
