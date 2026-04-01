import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ChatInput from "./ChatInput";

vi.mock("motion/react", () => ({
  motion: new Proxy(
    {},
    {
      get:
        (_target, tag: string) =>
        ({ children, ...props }: any) => {
          const { initial, animate, transition, whileHover, whileTap, ...domProps } = props;
          return <button data-testid={`motion-${tag}`} {...domProps}>{children}</button>;
        },
    }
  ),
}));

vi.mock("lucide-react", () => ({
  Send: () => <span data-testid="send-icon" />,
  Sparkles: () => <span data-testid="sparkles-icon" />,
}));

describe("ChatInput", () => {
  const onSend = vi.fn();

  beforeEach(() => {
    onSend.mockClear();
  });

  it("renders the textarea with the correct placeholder", () => {
    render(<ChatInput onSend={onSend} isLoading={false} />);
    expect(screen.getByPlaceholderText("Type a message...")).toBeInTheDocument();
  });

  it("renders the send button", () => {
    render(<ChatInput onSend={onSend} isLoading={false} />);
    expect(screen.getByTestId("send-icon")).toBeInTheDocument();
  });

  it("send button is disabled when input is empty", () => {
    render(<ChatInput onSend={onSend} isLoading={false} />);
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
  });

  it("send button is enabled when input has text", async () => {
    render(<ChatInput onSend={onSend} isLoading={false} />);
    const textarea = screen.getByPlaceholderText("Type a message...");
    await userEvent.type(textarea, "Hello");
    const button = screen.getByRole("button");
    expect(button).not.toBeDisabled();
  });

  it("send button is disabled when isLoading is true even with text", async () => {
    render(<ChatInput onSend={onSend} isLoading={true} />);
    const textarea = screen.getByPlaceholderText("Type a message...");
    await userEvent.type(textarea, "Hello");
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
  });

  it("calls onSend with the trimmed message when the form is submitted", async () => {
    render(<ChatInput onSend={onSend} isLoading={false} />);
    const textarea = screen.getByPlaceholderText("Type a message...");
    await userEvent.type(textarea, "  Hello World  ");
    await userEvent.click(screen.getByRole("button"));
    expect(onSend).toHaveBeenCalledWith("Hello World");
  });

  it("clears the input after submission", async () => {
    render(<ChatInput onSend={onSend} isLoading={false} />);
    const textarea = screen.getByPlaceholderText("Type a message...");
    await userEvent.type(textarea, "Hello");
    await userEvent.click(screen.getByRole("button"));
    expect(textarea).toHaveValue("");
  });

  it("calls onSend when Enter is pressed", async () => {
    render(<ChatInput onSend={onSend} isLoading={false} />);
    const textarea = screen.getByPlaceholderText("Type a message...");
    await userEvent.type(textarea, "Hello");
    await userEvent.keyboard("{Enter}");
    expect(onSend).toHaveBeenCalledWith("Hello");
  });

  it("does not call onSend when Shift+Enter is pressed", async () => {
    render(<ChatInput onSend={onSend} isLoading={false} />);
    const textarea = screen.getByPlaceholderText("Type a message...");
    await userEvent.type(textarea, "Hello");
    await userEvent.keyboard("{Shift>}{Enter}{/Shift}");
    expect(onSend).not.toHaveBeenCalled();
  });

  it("does not call onSend when input is only whitespace", async () => {
    render(<ChatInput onSend={onSend} isLoading={false} />);
    const textarea = screen.getByPlaceholderText("Type a message...");
    await userEvent.type(textarea, "   ");
    await userEvent.keyboard("{Enter}");
    expect(onSend).not.toHaveBeenCalled();
  });

  it("does not call onSend when Enter is pressed while isLoading", async () => {
    render(<ChatInput onSend={onSend} isLoading={true} />);
    const textarea = screen.getByPlaceholderText("Type a message...");
    await userEvent.type(textarea, "Hello");
    await userEvent.keyboard("{Enter}");
    expect(onSend).not.toHaveBeenCalled();
  });

  it("does not call onSend when button is clicked on empty input", async () => {
    render(<ChatInput onSend={onSend} isLoading={false} />);
    const button = screen.getByRole("button");
    await userEvent.click(button);
    expect(onSend).not.toHaveBeenCalled();
  });

  it("updates the textarea value as the user types", async () => {
    render(<ChatInput onSend={onSend} isLoading={false} />);
    const textarea = screen.getByPlaceholderText("Type a message...");
    await userEvent.type(textarea, "Hello");
    expect(textarea).toHaveValue("Hello");
  });

  it("renders the sparkles decorative icon", () => {
    render(<ChatInput onSend={onSend} isLoading={false} />);
    expect(screen.getByTestId("sparkles-icon")).toBeInTheDocument();
  });
});
