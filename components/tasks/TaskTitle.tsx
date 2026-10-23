"use client";

type Props = {
  title: string;
  isDone: boolean;
};

/**
 * Taaktitel op één regel; te lang → horizontaal vegen om de rest te lezen.
 * Het zachte randje rechts verraadt dat er meer staat (korte titels raken het niet).
 */
export function TaskTitle({ title, isDone }: Props) {
  return (
    <div
      className="overflow-x-auto no-scrollbar"
      style={{
        maskImage: "linear-gradient(to right, #000 calc(100% - 20px), transparent)",
        WebkitMaskImage: "linear-gradient(to right, #000 calc(100% - 20px), transparent)",
      }}
    >
      <p
        className="text-sm font-medium whitespace-nowrap pr-5"
        style={{
          color: isDone ? "#9A8F84" : "#1A1410",
          textDecoration: isDone ? "line-through" : "none",
          letterSpacing: "-.01em",
        }}
      >
        {title}
      </p>
    </div>
  );
}
