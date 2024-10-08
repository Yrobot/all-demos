"use client";
import React, { useState, useMemo, useEffect } from "react";
import {
  createPage,
  getRootDatabase,
  createRootDB,
  getAllDataBases,
} from "@/service/notion";
import { useRequest } from "ahooks";
import toast from "react-hot-toast";

function RootDBBox({ token }: { token: string }) {
  const [seed, setSeed] = useState(0);
  const titleList = useMemo(
    () =>
      seed === 0
        ? []
        : [...Array(3)].map(
            () => `Conversation ${Math.floor((1000 * Math.random()) % 1000)}`
          ),
    [seed]
  );
  useEffect(() => {
    setSeed((old) => old + 1);
  }, []);

  const { loading: createLoading, run: createPages } = useRequest(
    async () => {
      let database_id = (await getRootDatabase(token))?.id;
      if (!database_id) {
        database_id = (await createRootDB(token))?.id;
      }
      return Promise.all(
        titleList.map((title) =>
          createPage({
            token,
            parent: {
              database_id: database_id,
            },
            title,
          })
        )
      );
    },
    {
      manual: true,
      onSuccess: () => {
        toast.success("Pages created");
        setSeed((old) => old + 1);
      },
      onError: (err) => {
        console.log(err);
        toast.error("Pages create Fail");
      },
    }
  );
  return (
    <div className="w-60">
      <p className="mb-2">Create pages under Brainglue Database:</p>
      <ul>
        {titleList.map((title) => (
          <li className="" key={title}>
            - {title}
          </li>
        ))}
      </ul>
      <div className="mt-4">
        <button className="btn" onClick={createPages} disabled={createLoading}>
          {createLoading ? "Creating" : "Create Pages in DataBase"}
        </button>
      </div>
    </div>
  );
}

export default RootDBBox;
