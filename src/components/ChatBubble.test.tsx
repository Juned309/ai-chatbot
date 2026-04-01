import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ChatBubble from "./ChatBubble";
import { Message } from "../types";

vi.mock("motion/react", () => ({
  motion: new Proxy(
    {},
    {
      get:
        (_target, tag: string) =>
        ({ children, ...props }: any) => {
          const { initial, animate, transition, whileHover, whileTap, ...domProps } = props;
          return <div data-testid={`motion-${tag}`} {...domProps}>{children}</div>;
        },
    }
  ),
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock("react-markdown", () => ({
  default: ({ children }: { children: string }) => <span data-testid="markdown">{children}</span>,
}));

vi.mock("lucide-react", () => ({
  Heart: () => <span data-testid="heart-icon" />,
}));

describe("ChatBubble", () => {
  const userMessage: Message = { role: "user", content: "Hello there!" };
  const modelMessage: Message = { role: "model", content: "Hey babe! 💕" };

  it("renders the message content", () => {
    render(<ChatBubble message={userMessage} />);
    expect(screen.getByTestId("markdown")).toHaveTextContent("Hello there!");
  });

  it("renders a user message aligned to the right (justify-end)", () => {
    const { container } = render(<ChatBubble message={userMessage} />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain("justify-end");
  });

  it("renders a model message aligned to the left (justify-start)", () => {
    const { container } = render(<ChatBubble message={modelMessage} />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain("justify-start");
  });

  it("shows the 'Aria' label for model messages", () => {
    render(<ChatBubble message={modelMessage} />);
    expect(screen.getByText("Aria")).toBeInTheDocument();
  });

  it("does not show the 'Aria' label for user messages", () => {
    render(<ChatBubble message={userMessage} />);
    expect(screen.queryByText("Aria")).not.toBeInTheDocument();
  });

  it("shows the heart icon for model messages", () => {
    render(<ChatBubble message={modelMessage} />);
    expect(screen.getByTestId("heart-icon")).toBeInTheDocument();
  });

  it("does not show the heart icon for user messages", () => {
    render(<ChatBubble message={userMessage} />);
    expect(screen.queryByTestId("heart-icon")).not.toBeInTheDocument();
  });

  it("renders markdown content via the Markdown component", () => {
    render(<ChatBubble message={{ role: "model", content: "**bold text**" }} />);
    expect(screen.getByTestId("markdown")).toHaveTextContent("**bold text**");
  });

  it("renders empty content without crashing", () => {
    render(<ChatBubble message={{ role: "user", content: "" }} />);
    expect(screen.getByTestId("markdown")).toBeInTheDocument();
  });

  it("applies correct bubble style classes for user messages", () => {
    const { container } = render(<ChatBubble message={userMessage} />);
    const bubble = container.querySelector("[class*='rounded-tr-none']");
    expect(bubble).toBeInTheDocument();
  });

  it("applies correct bubble style classes for model messages", () => {
    const { container } = render(<ChatBubble message={modelMessage} />);
    const bubble = container.querySelector("[class*='rounded-tl-none']");
    expect(bubble).toBeInTheDocument();
  });
});
