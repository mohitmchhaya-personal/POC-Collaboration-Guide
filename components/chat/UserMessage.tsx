type UserMessageProps = {
  content: string;
};

export function UserMessage({ content }: UserMessageProps) {
  return (
    <li className="flex justify-end">
      <div className="max-w-[80%] break-words whitespace-pre-wrap rounded-2xl bg-brand-blue px-4 py-3 text-white">
        <span className="sr-only">You</span>
        {content}
      </div>
    </li>
  );
}
