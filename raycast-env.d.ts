/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `add-action` command */
  export type AddAction = ExtensionPreferences & {}
  /** Preferences accessible in the `list-actions` command */
  export type ListActions = ExtensionPreferences & {}
  /** Preferences accessible in the `extract-tasks` command */
  export type ExtractTasks = ExtensionPreferences & {
  /** OpenAI API Key - Your OpenAI API key for GPT-4.1-mini */
  "apiKey": string
}
  /** Preferences accessible in the `tweetify` command */
  export type Tweetify = ExtensionPreferences & {
  /** OpenAI API Key - Your OpenAI API key for GPT-4.1-mini */
  "apiKey": string
}
  /** Preferences accessible in the `anki-capture` command */
  export type AnkiCapture = ExtensionPreferences & {
  /** OpenAI API Key - Your OpenAI API key for GPT-4.1-mini */
  "apiKey": string
}
  /** Preferences accessible in the `add-reminder` command */
  export type AddReminder = ExtensionPreferences & {}
  /** Preferences accessible in the `list-reminders` command */
  export type ListReminders = ExtensionPreferences & {}
  /** Preferences accessible in the `usage-dashboard` command */
  export type UsageDashboard = ExtensionPreferences & {
  /** Show Cost Estimates - Display projected monthly costs based on current usage */
  "showEstimates": boolean
}
  /** Preferences accessible in the `api-usage` command */
  export type ApiUsage = ExtensionPreferences & {
  /** OpenAI API Key - Your OpenAI API key */
  "OPENAI_API_KEY"?: string,
  /** Anthropic API Key - Your Anthropic API key */
  "ANTHROPIC_API_KEY"?: string,
  /** Google API Key - Your Google API key */
  "GOOGLE_API_KEY"?: string,
  /** DeepSeek API Key - Your DeepSeek API key */
  "DEEPSEEK_API_KEY"?: string
}
  /** Preferences accessible in the `improve-prompt` command */
  export type ImprovePrompt = ExtensionPreferences & {
  /** Google API Key - Your Google API key for Gemini 2.0 Flash */
  "apiKey": string
}
}

declare namespace Arguments {
  /** Arguments passed to the `add-action` command */
  export type AddAction = {}
  /** Arguments passed to the `list-actions` command */
  export type ListActions = {}
  /** Arguments passed to the `extract-tasks` command */
  export type ExtractTasks = {}
  /** Arguments passed to the `tweetify` command */
  export type Tweetify = {}
  /** Arguments passed to the `anki-capture` command */
  export type AnkiCapture = {}
  /** Arguments passed to the `add-reminder` command */
  export type AddReminder = {}
  /** Arguments passed to the `list-reminders` command */
  export type ListReminders = {}
  /** Arguments passed to the `usage-dashboard` command */
  export type UsageDashboard = {}
  /** Arguments passed to the `api-usage` command */
  export type ApiUsage = {}
  /** Arguments passed to the `improve-prompt` command */
  export type ImprovePrompt = {}
}

