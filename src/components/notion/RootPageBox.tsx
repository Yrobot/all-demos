"use client";
import React, { useState, useEffect, useMemo } from "react";
import { createPage, getRootPage } from "@/service/notion";
import { useRequest } from "ahooks";
import toast from "react-hot-toast";

function RootPageBox({ token }: { token: string }) {
  const [seed, setSeed] = useState(0);
  const { data: rootPage, loading: rootLoading } = useRequest(
    async () => getRootPage(token),
    {}
  );
  const titleList = useMemo(
    () =>
      [...Array(3)].map(
        () => `Conversation ${Math.floor((1000 * Math.random()) % 1000)}`
      ),
    [seed]
  );

  const { loading: createLoading, run: createPages } = useRequest(
    async () =>
      Promise.all(
        titleList.map((title) =>
          createPage({
            token,
            parent: {
              page_id: rootPage?.id || "",
            },
            title,
          })
        )
      ),
    {
      manual: true,
      onSuccess: () => {
        toast.success("Pages created");
        setSeed(seed + 1);
      },
      onError: () => {
        toast.error("Pages create Fail");
      },
    }
  );
  return (
    <div className="w-60">
      <p className="mb-2">Create pages under Root Page:</p>
      <ul>
        {titleList.map((title) => (
          <li className="" key={title}>
            - {title}
          </li>
        ))}
      </ul>
      <div className="mt-4">
        <button
          className="btn"
          onClick={createPages}
          disabled={createLoading || !rootPage?.id}
        >
          {createLoading ? "Creating" : "Create"}
        </button>
      </div>
    </div>
  );
}

export default RootPageBox;
