"use client";
import React, { useEffect, useState } from "react";
import { getRootPage } from "@/service/notion";

function RootPage({
  token,
  onRootId,
}: {
  token: string;
  onRootId?: (id: string) => void;
}) {
  const [root, setRoot] = useState<any>(null);
  useEffect(() => {
    getRootPage(token).then((root) => {
      setRoot(root ?? null);
      onRootId?.(root?.id || "");
    });
  }, []);
  if (!root)
    return (
      <div className="">You have to create a Page named `Brainglue` first</div>
    );
  return (
    <div className="">
      <span className="opacity-60 mr-2">{`Root Page (with title 'brainglue'):`}</span>
      <span className="">{`${root.title} [${root.id}]`}</span>
    </div>
  );
}

export default RootPage;
