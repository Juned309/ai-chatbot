import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";

// --- Mocks ---

vi.mock("./firebase", () => ({
  db: {},
  auth: { currentUser: null },
  app: {},
}));

const mockOnAuthStateChanged = vi.fn();
const mockSignInWithPopup = vi.fn();
const mockSignOut = vi.fn();

vi.mock("firebase/auth", () => ({
  GoogleAuthProvider: vi.fn().mockImplementation(() => ({})),
  signInWithPopup: (...args: any[]) => mockSignInWithPopup(...args),
  onAuthStateChanged: (...args: any[]) => mockOnAuthStateChanged(...args),
  signOut: (...args: any[]) => mockSignOut(...args),
}));

const mockGetDocs = vi.fn();
const mockAddDoc = vi.fn();
const mockCollection = vi.fn().mockReturnValue({});
const mockQuery = vi.fn().mockReturnValue({});
const mockOrderBy = vi.fn().mockReturnValue({});
const mockServerTimestamp = vi.fn().mockReturnValue("mock-timestamp");

vi.mock("firebase/firestore", () => ({
  collection: (...args: any[]) => mockCollection(...args),
  query: (...args: any[]) => mockQuery(...args),
  orderBy: (...args: any[]) => mockOrderBy(...args),
  addDoc: (...args: any[]) => mockAddDoc(...args),
  getDocs: (...args: any[]) => mockGetDocs(...args),
  serverTimestamp: () => mockServerTimestamp(),
}));

const mockGetAriaResponse = vi.fn();
vi.mock("./services/gemini", () => ({
  getAriaResponse: (...args: any[]) => mockGetAriaResponse(...args),
}));

vi.mock("motion/react", () => ({
  motion: new Proxy(
    {},
    {
      get:
        (_target, tag: string) =>
        ({ children, ...props }: any) => {
          const { initial, animate, transition, whileHover, whileTap, exit, ...domProps } = props;
          const Tag = tag as keyof JSX.IntrinsicElements;
          return <Tag {...domProps}>{children}</Tag>;
        },
    }
  ),
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock("react-markdown", () => ({
  default: ({ children }: { children: string }) => <span>{children}</span>,
}));

vi.mock("lucide-react", () => ({
  Heart: () => <span data-testid="heart-icon" />,
  Trash2: () => <span data-testid="trash-icon" />,
  Info: () => <span data-testid="info-icon" />,
  Sparkles: () => <span data-testid="sparkles-icon" />,
  Send: () => <span data-testid="send-icon" />,
}));

// --- Helpers ---

const mockUser = { uid: "user-123", displayName: "Test User" };

function simulateLoggedOut() {
  mockOnAuthStateChanged.mockImplementation((_auth: any, cb: (u: null) => void) => {
    cb(null);
    return () => {};
  });
}

function simulateLoggedIn(user = mockUser) {
  mockOnAuthStateChanged.mockImplementation((_auth: any, cb: (u: typeof mockUser) => void) => {
    cb(user);
    return () => {};
  });
}

function emptyMessagesSnapshot() {
  mockGetDocs.mockResolvedValue({ docs: [] });
}

function messagesSnapshot(messages: { role: string; content: string }[]) {
  mockGetDocs.mockResolvedValue({
    docs: messages.map((m) => ({ data: () => m })),
  });
}

// --- Tests ---

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAddDoc.mockResolvedValue({});
    mockSignInWithPopup.mockResolvedValue({});
    mockSignOut.mockResolvedValue({});
    (globalThis.fetch as Mock).mockResolvedValue({ ok: true });
  });

  describe("Login Screen", () => {
    it("shows the login button when user is not authenticated", async () => {
      simulateLoggedOut();
      render(<App />);
      expect(screen.getByText("Login with Google")).toBeInTheDocument();
    });

    it("does not render the chat header when not authenticated", async () => {
      simulateLoggedOut();
      render(<App />);
      expect(screen.queryByText("Aria")).not.toBeInTheDocument();
    });

    it("calls signInWithPopup when login button is clicked", async () => {
      simulateLoggedOut();
      render(<App />);
      await userEvent.click(screen.getByText("Login with Google"));
      expect(mockSignInWithPopup).toHaveBeenCalledOnce();
    });
  });

  describe("Authenticated Chat UI", () => {
    it("renders the chat header when user is authenticated", async () => {
      simulateLoggedIn();
      emptyMessagesSnapshot();

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText("Aria")).toBeInTheDocument();
      });
    });

    it("renders the logout button when authenticated", async () => {
      simulateLoggedIn();
      emptyMessagesSnapshot();

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText("Logout")).toBeInTheDocument();
      });
    });

    it("calls signOut when logout button is clicked", async () => {
      simulateLoggedIn();
      emptyMessagesSnapshot();

      render(<App />);
      await waitFor(() => screen.getByText("Logout"));
      await userEvent.click(screen.getByText("Logout"));

      expect(mockSignOut).toHaveBeenCalledOnce();
    });

    it("shows the message input when authenticated", async () => {
      simulateLoggedIn();
      emptyMessagesSnapshot();

      render(<App />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Type a message...")).toBeInTheDocument();
      });
    });
  });

  describe("Message Loading", () => {
    it("displays a greeting when the user has no previous messages", async () => {
      simulateLoggedIn();
      emptyMessagesSnapshot();

      render(<App />);

      await waitFor(() => {
        expect(
          screen.getByText("Hey babe! I missed you... how was your day? ❤️")
        ).toBeInTheDocument();
      });
    });

    it("sends the greeting message to the local API", async () => {
      simulateLoggedIn();
      emptyMessagesSnapshot();

      render(<App />);

      await waitFor(() => {
        expect(globalThis.fetch).toHaveBeenCalledWith(
          "/api/messages",
          expect.objectContaining({ method: "POST" })
        );
      });
    });

    it("displays previously stored messages for the user", async () => {
      simulateLoggedIn();
      messagesSnapshot([
        { role: "user", content: "Hi Aria" },
        { role: "model", content: "Hey babe! 💕" },
      ]);

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText("Hi Aria")).toBeInTheDocument();
        expect(screen.getByText("Hey babe! 💕")).toBeInTheDocument();
      });
    });

    it("clears messages when the user logs out", async () => {
      let authCallback: (u: typeof mockUser | null) => void = () => {};
      mockOnAuthStateChanged.mockImplementation((_auth: any, cb: typeof authCallback) => {
        authCallback = cb;
        cb(mockUser);
        return () => {};
      });
      messagesSnapshot([{ role: "user", content: "Hi Aria" }]);

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText("Hi Aria")).toBeInTheDocument();
      });

      act(() => {
        authCallback(null);
      });

      await waitFor(() => {
        expect(screen.queryByText("Hi Aria")).not.toBeInTheDocument();
      });
    });
  });

  describe("Sending Messages", () => {
    it("displays the user message immediately after sending", async () => {
      simulateLoggedIn();
      emptyMessagesSnapshot();
      mockGetAriaResponse.mockResolvedValue("I love you! ❤️");

      render(<App />);
      await waitFor(() => screen.getByPlaceholderText("Type a message..."));

      const textarea = screen.getByPlaceholderText("Type a message...");
      await userEvent.type(textarea, "Hello Aria");
      await userEvent.keyboard("{Enter}");

      await waitFor(() => {
        expect(screen.getByText("Hello Aria")).toBeInTheDocument();
      });
    });

    it("displays the AI response after the user message", async () => {
      simulateLoggedIn();
      emptyMessagesSnapshot();
      mockGetAriaResponse.mockResolvedValue("I love you! ❤️");

      render(<App />);
      await waitFor(() => screen.getByPlaceholderText("Type a message..."));

      const textarea = screen.getByPlaceholderText("Type a message...");
      await userEvent.type(textarea, "Hello Aria");
      await userEvent.keyboard("{Enter}");

      await waitFor(() => {
        expect(screen.getByText("I love you! ❤️")).toBeInTheDocument();
      });
    });

    it("shows '...' as fallback when AI response is empty", async () => {
      simulateLoggedIn();
      emptyMessagesSnapshot();
      mockGetAriaResponse.mockResolvedValue(undefined);

      render(<App />);
      await waitFor(() => screen.getByPlaceholderText("Type a message..."));

      const textarea = screen.getByPlaceholderText("Type a message...");
      await userEvent.type(textarea, "Hello");
      await userEvent.keyboard("{Enter}");

      await waitFor(() => {
        expect(screen.getByText("...")).toBeInTheDocument();
      });
    });

    it("calls getAriaResponse with the last 8 messages of context", async () => {
      simulateLoggedIn();
      const existingMessages = Array.from({ length: 10 }, (_, i) => ({
        role: i % 2 === 0 ? "user" : "model",
        content: `msg ${i}`,
      }));
      messagesSnapshot(existingMessages);
      mockGetAriaResponse.mockResolvedValue("Hi!");

      render(<App />);
      await waitFor(() => screen.getByPlaceholderText("Type a message..."));

      const textarea = screen.getByPlaceholderText("Type a message...");
      await userEvent.type(textarea, "new message");
      await userEvent.keyboard("{Enter}");

      await waitFor(() => {
        expect(mockGetAriaResponse).toHaveBeenCalledWith(
          expect.arrayContaining([expect.objectContaining({ content: "new message" })])
        );
        const callArg = mockGetAriaResponse.mock.calls[0][0];
        expect(callArg).toHaveLength(8);
      });
    });

    it("saves the user message to Firestore", async () => {
      simulateLoggedIn();
      emptyMessagesSnapshot();
      mockGetAriaResponse.mockResolvedValue("Hi!");

      render(<App />);
      await waitFor(() => screen.getByPlaceholderText("Type a message..."));

      const textarea = screen.getByPlaceholderText("Type a message...");
      await userEvent.type(textarea, "Test message");
      await userEvent.keyboard("{Enter}");

      await waitFor(() => {
        expect(mockAddDoc).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({ role: "user", content: "Test message" })
        );
      });
    });
  });

  describe("Clear Chat", () => {
    it("resets messages to the greeting after confirmation", async () => {
      simulateLoggedIn();
      messagesSnapshot([{ role: "user", content: "Old message" }]);
      (window.confirm as Mock).mockReturnValue(true);

      render(<App />);
      await waitFor(() => screen.getByText("Old message"));

      await userEvent.click(screen.getByTitle("Clear Chat"));

      await waitFor(() => {
        expect(
          screen.getByText("Hey babe! I missed you... how was your day? ❤️")
        ).toBeInTheDocument();
        expect(screen.queryByText("Old message")).not.toBeInTheDocument();
      });
    });

    it("calls the /api/clear endpoint when clearing chat", async () => {
      simulateLoggedIn();
      messagesSnapshot([{ role: "user", content: "Old message" }]);
      (window.confirm as Mock).mockReturnValue(true);

      render(<App />);
      await waitFor(() => screen.getByText("Old message"));
      await userEvent.click(screen.getByTitle("Clear Chat"));

      await waitFor(() => {
        expect(globalThis.fetch).toHaveBeenCalledWith(
          "/api/clear",
          expect.objectContaining({ method: "POST" })
        );
      });
    });

    it("does not clear chat when the user cancels the confirmation", async () => {
      simulateLoggedIn();
      messagesSnapshot([{ role: "user", content: "Old message" }]);
      (window.confirm as Mock).mockReturnValue(false);

      render(<App />);
      await waitFor(() => screen.getByText("Old message"));
      await userEvent.click(screen.getByTitle("Clear Chat"));

      expect(screen.getByText("Old message")).toBeInTheDocument();
    });
  });
});
