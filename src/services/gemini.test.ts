import { describe, it, expect, vi, beforeEach } from "vitest";
import { getAriaResponse } from "./gemini";

vi.mock("@google/genai", () => {
  const generateContent = vi.fn();
  const GoogleGenAI = vi.fn().mockImplementation(() => ({
    models: { generateContent },
  }));
  return { GoogleGenAI, _generateContent: generateContent };
});

// Retrieve the mock function after vi.mock is hoisted
import * as genAiModule from "@google/genai";

function getMockGenerateContent() {
  const instance = new (genAiModule.GoogleGenAI as any)({});
  return instance.models.generateContent as ReturnType<typeof vi.fn>;
}

describe("getAriaResponse", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls the Gemini API with the correct model", async () => {
    const mockGenerateContent = getMockGenerateContent();
    mockGenerateContent.mockResolvedValue({ text: "Hey babe!" });

    await getAriaResponse([{ role: "user", content: "Hello" }]);

    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.objectContaining({ model: "gemini-3-flash-preview" })
    );
  });

  it("maps user messages to the correct role", async () => {
    const mockGenerateContent = getMockGenerateContent();
    mockGenerateContent.mockResolvedValue({ text: "Hi!" });

    await getAriaResponse([{ role: "user", content: "Hello" }]);

    const callArg = mockGenerateContent.mock.calls[0][0];
    expect(callArg.contents[0]).toEqual({
      role: "user",
      parts: [{ text: "Hello" }],
    });
  });

  it("maps model messages to the correct role", async () => {
    const mockGenerateContent = getMockGenerateContent();
    mockGenerateContent.mockResolvedValue({ text: "Sure!" });

    await getAriaResponse([{ role: "model", content: "I'm Aria" }]);

    const callArg = mockGenerateContent.mock.calls[0][0];
    expect(callArg.contents[0]).toEqual({
      role: "model",
      parts: [{ text: "I'm Aria" }],
    });
  });

  it("maps non-user roles to model", async () => {
    const mockGenerateContent = getMockGenerateContent();
    mockGenerateContent.mockResolvedValue({ text: "Sure!" });

    await getAriaResponse([{ role: "assistant", content: "Hello" }]);

    const callArg = mockGenerateContent.mock.calls[0][0];
    expect(callArg.contents[0].role).toBe("model");
  });

  it("sends the full conversation history", async () => {
    const mockGenerateContent = getMockGenerateContent();
    mockGenerateContent.mockResolvedValue({ text: "Of course!" });

    const history = [
      { role: "user", content: "Hi" },
      { role: "model", content: "Hey!" },
      { role: "user", content: "How are you?" },
    ];

    await getAriaResponse(history);

    const callArg = mockGenerateContent.mock.calls[0][0];
    expect(callArg.contents).toHaveLength(3);
  });

  it("passes the system instruction in the config", async () => {
    const mockGenerateContent = getMockGenerateContent();
    mockGenerateContent.mockResolvedValue({ text: "Hi!" });

    await getAriaResponse([{ role: "user", content: "Hello" }]);

    const callArg = mockGenerateContent.mock.calls[0][0];
    expect(callArg.config.systemInstruction).toBeTruthy();
    expect(callArg.config.systemInstruction).toContain("Aria");
  });

  it("uses the correct generation parameters", async () => {
    const mockGenerateContent = getMockGenerateContent();
    mockGenerateContent.mockResolvedValue({ text: "Hi!" });

    await getAriaResponse([{ role: "user", content: "Hello" }]);

    const callArg = mockGenerateContent.mock.calls[0][0];
    expect(callArg.config.temperature).toBe(0.9);
    expect(callArg.config.topP).toBe(0.95);
    expect(callArg.config.topK).toBe(40);
  });

  it("returns the text from the API response", async () => {
    const mockGenerateContent = getMockGenerateContent();
    mockGenerateContent.mockResolvedValue({ text: "I missed you ❤️" });

    const result = await getAriaResponse([{ role: "user", content: "Hello" }]);

    expect(result).toBe("I missed you ❤️");
  });

  it("returns undefined when response text is absent", async () => {
    const mockGenerateContent = getMockGenerateContent();
    mockGenerateContent.mockResolvedValue({ text: undefined });

    const result = await getAriaResponse([{ role: "user", content: "Hello" }]);

    expect(result).toBeUndefined();
  });

  it("throws when the API call fails", async () => {
    const mockGenerateContent = getMockGenerateContent();
    mockGenerateContent.mockRejectedValue(new Error("API Error"));

    await expect(
      getAriaResponse([{ role: "user", content: "Hello" }])
    ).rejects.toThrow("API Error");
  });

  it("handles an empty history array", async () => {
    const mockGenerateContent = getMockGenerateContent();
    mockGenerateContent.mockResolvedValue({ text: "Hi!" });

    await getAriaResponse([]);

    const callArg = mockGenerateContent.mock.calls[0][0];
    expect(callArg.contents).toEqual([]);
  });
});
