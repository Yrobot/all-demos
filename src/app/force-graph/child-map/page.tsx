import dynamic from "next/dynamic";
// import View from "./View";

const View = dynamic(() => import("./View"), {
  ssr: false,
  loading: () => <p>Loading Dynamic Component</p>,
});

export const metadata = {
  title: "Force Graph 3D",
};

export default function Page() {
  return <View />;
}
