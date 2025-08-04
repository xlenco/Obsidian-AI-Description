"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// main.ts
var main_exports = {};
__export(main_exports, {
  default: () => AutoDescriptionPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var DEFAULT_SETTINGS = {
  apiProvider: "openai",
  apiKey: "",
  apiUrl: "https://api.openai.com/v1/chat/completions",
  model: "gpt-3.5-turbo",
  summaryLength: 150,
  customPrompt: "\u8BF7\u4E3A\u4EE5\u4E0B\u6587\u672C\u751F\u6210\u4E00\u4E2A{length}\u5B57\u5DE6\u53F3\u7684\u6458\u8981: \n\n{content}"
};
var AutoDescriptionPlugin = class extends import_obsidian.Plugin {
  // 使用!断言属性会被初始化
  async onload() {
    await this.loadSettings();
    this.addCommand({
      id: "generate-description",
      name: "\u751F\u6210\u6587\u6863\u6458\u8981",
      editorCallback: async (editor, ctx) => {
        if (ctx instanceof import_obsidian.MarkdownView) {
          await this.generateDescription(editor);
        } else {
          new import_obsidian.Notice("\u8BF7\u5728\u7F16\u8F91\u5668\u4E2D\u4F7F\u7528\u6B64\u547D\u4EE4");
        }
      }
    });
    this.addSettingTab(new AutoDescriptionSettingTab(this.app, this));
  }
  async loadSettings() {
    this.settings = __spreadValues(__spreadValues({}, DEFAULT_SETTINGS), await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  // 调用AI API生成摘要
  async callAI(content) {
    var _a, _b, _c, _d;
    if (!this.settings.apiKey) {
      new import_obsidian.Notice("\u8BF7\u5148\u5728\u8BBE\u7F6E\u4E2D\u914D\u7F6EAPI\u5BC6\u94A5");
      return "";
    }
    if (!this.settings.apiUrl) {
      new import_obsidian.Notice("\u8BF7\u5148\u5728\u8BBE\u7F6E\u4E2D\u914D\u7F6EAPI URL");
      return "";
    }
    try {
      const prompt = this.settings.customPrompt.replace("{length}", this.settings.summaryLength.toString()).replace("{content}", content);
      let requestBody = {
        model: this.settings.model,
        messages: [
          {
            role: "system",
            content: "\u4F60\u662F\u4E00\u4E2A\u4E13\u4E1A\u7684\u6587\u7AE0\u6458\u8981\u751F\u6210\u52A9\u624B\uFF0C\u64C5\u957F\u63D0\u70BC\u6587\u7AE0\u6838\u5FC3\u5185\u5BB9\u3002"
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: Math.max(100, Math.min(500, this.settings.summaryLength * 2))
      };
      if (this.settings.apiProvider === "kimi") {
        requestBody = {
          model: this.settings.model,
          messages: [
            {
              role: "system",
              content: "\u4F60\u662F\u4E00\u4E2A\u4E13\u4E1A\u7684\u6587\u7AE0\u6458\u8981\u751F\u6210\u52A9\u624B\uFF0C\u64C5\u957F\u63D0\u70BC\u6587\u7AE0\u6838\u5FC3\u5185\u5BB9\u3002"
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.6
        };
      } else if (this.settings.apiProvider === "deepseek") {
        requestBody = {
          model: this.settings.model,
          messages: [
            {
              role: "system",
              content: "\u4F60\u662F\u4E00\u4E2A\u4E13\u4E1A\u7684\u6587\u7AE0\u6458\u8981\u751F\u6210\u52A9\u624B\uFF0C\u64C5\u957F\u63D0\u70BC\u6587\u7AE0\u6838\u5FC3\u5185\u5BB9\u3002"
            },
            {
              role: "user",
              content: prompt
            }
          ],
          max_tokens: Math.max(100, Math.min(500, this.settings.summaryLength * 2))
        };
      }
      const response = await fetch(this.settings.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.settings.apiKey}`
        },
        body: JSON.stringify(requestBody)
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API\u9519\u8BEF: ${((_a = errorData.error) == null ? void 0 : _a.message) || errorData.message || "\u672A\u77E5\u9519\u8BEF"}`);
      }
      const data = await response.json();
      let summary = "";
      if (data.choices && data.choices.length > 0) {
        summary = ((_d = (_c = (_b = data.choices[0]) == null ? void 0 : _b.message) == null ? void 0 : _c.content) == null ? void 0 : _d.trim()) || "";
      } else if (data.result) {
        summary = data.result.trim();
      }
      return summary || "\u65E0\u6CD5\u751F\u6210\u6458\u8981";
    } catch (error) {
      console.error("\u8C03\u7528AI API\u5931\u8D25:", error);
      new import_obsidian.Notice(`\u751F\u6210\u6458\u8981\u5931\u8D25: ${error.message}`);
      return "";
    }
  }
  // 生成并插入摘要
  async generateDescription(editor) {
    const content = editor.getValue();
    if (!content.trim()) {
      new import_obsidian.Notice("\u6587\u6863\u5185\u5BB9\u4E3A\u7A7A\uFF0C\u65E0\u6CD5\u751F\u6210\u6458\u8981");
      return;
    }
    new import_obsidian.Notice("\u6B63\u5728\u751F\u6210\u6458\u8981...");
    try {
      const cleanContent = this.extractContent(content);
      const summary = await this.callAI(cleanContent);
      if (summary) {
        this.insertSummaryToFrontMatter(editor, summary);
        new import_obsidian.Notice("\u6458\u8981\u5DF2\u6210\u529F\u6DFB\u52A0\u5230Front Matter");
      }
    } catch (error) {
      console.error("\u751F\u6210\u6458\u8981\u5931\u8D25:", error);
      new import_obsidian.Notice(`\u751F\u6210\u6458\u8981\u5931\u8D25: ${error.message}`);
    }
  }
  // 提取文档内容（去除Front Matter）
  extractContent(content) {
    const frontMatterRegex = /^---\s*\n([\s\S]*?)\s*---\s*\n/;
    const match = content.match(frontMatterRegex);
    if (match) {
      return content.replace(frontMatterRegex, "").trim();
    }
    return content.trim();
  }
  // 将摘要插入到Front Matter
  insertSummaryToFrontMatter(editor, summary) {
    const content = editor.getValue();
    const frontMatterRegex = /^---\s*\n([\s\S]*?)\s*---\s*\n/;
    const match = content.match(frontMatterRegex);
    let newContent = content;
    const escapedSummary = summary.replace(/\n/g, "\n  ").replace(/"/g, '\\"');
    if (match) {
      const frontMatter = match[1];
      const descriptionRegex = /description:\s*(.*?)(\n|$)/m;
      const frontMatterMatch = frontMatter.match(descriptionRegex);
      if (frontMatterMatch) {
        const updatedFrontMatter = frontMatter.replace(
          descriptionRegex,
          `description: "${escapedSummary}"`
        );
        newContent = content.replace(frontMatterRegex, `---
${updatedFrontMatter}
---
`);
      } else {
        const updatedFrontMatter = `${frontMatter}
description: "${escapedSummary}"`;
        newContent = content.replace(frontMatterRegex, `---
${updatedFrontMatter}
---
`);
      }
    } else {
      newContent = `---
description: "${escapedSummary}"
---
${content}`;
    }
    editor.setValue(newContent);
  }
};
var AutoDescriptionSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "AI \u6458\u8981\u751F\u6210\u8BBE\u7F6E" });
    new import_obsidian.Setting(containerEl).setName("AI\u63D0\u4F9B\u5546").setDesc("\u9009\u62E9\u8981\u4F7F\u7528\u7684AI\u670D\u52A1\u63D0\u4F9B\u5546").addDropdown((dropdown) => dropdown.addOption("openai", "OpenAI").addOption("deepseek", "DeepSeek").addOption("kimi", "Kimi").addOption("custom", "\u81EA\u5B9A\u4E49").setValue(this.plugin.settings.apiProvider).onChange(async (value) => {
      this.plugin.settings.apiProvider = value;
      if (value === "openai") {
        this.plugin.settings.apiUrl = "https://api.openai.com/v1/chat/completions";
        this.plugin.settings.model = "gpt-3.5-turbo";
      } else if (value === "deepseek") {
        this.plugin.settings.apiUrl = "https://api.deepseek.com/v1/chat/completions";
        this.plugin.settings.model = "deepseek-chat";
      } else if (value === "kimi") {
        this.plugin.settings.apiUrl = "https://api.moonshot.cn/v1/chat/completions";
        this.plugin.settings.model = "moonshot-v1-8k";
      }
      await this.plugin.saveSettings();
      this.display();
    }));
    new import_obsidian.Setting(containerEl).setName("API URL").setDesc("AI\u670D\u52A1\u7684API\u7AEF\u70B9URL").addText((text) => text.setPlaceholder("\u8F93\u5165API URL").setValue(this.plugin.settings.apiUrl).onChange(async (value) => {
      this.plugin.settings.apiUrl = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("API\u5BC6\u94A5").setDesc("\u8BBF\u95EEAI\u670D\u52A1\u6240\u9700\u7684API\u5BC6\u94A5").addText((text) => text.setPlaceholder("\u8F93\u5165API\u5BC6\u94A5").setValue(this.plugin.settings.apiKey).onChange(async (value) => {
      this.plugin.settings.apiKey = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("\u6A21\u578B").setDesc("\u9009\u62E9\u8981\u4F7F\u7528\u7684AI\u6A21\u578B").addText((text) => text.setPlaceholder("\u8F93\u5165\u6A21\u578B\u540D\u79F0").setValue(this.plugin.settings.model).onChange(async (value) => {
      this.plugin.settings.model = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("\u6458\u8981\u957F\u5EA6").setDesc("\u751F\u6210\u7684\u6458\u8981\u5927\u81F4\u5B57\u6570").addSlider((slider) => slider.setLimits(50, 500, 10).setValue(this.plugin.settings.summaryLength).setDynamicTooltip().onChange(async (value) => {
      this.plugin.settings.summaryLength = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("\u81EA\u5B9A\u4E49\u63D0\u793A").setDesc("\u751F\u6210\u6458\u8981\u7684\u63D0\u793A\u6A21\u677F\uFF0C{length}\u4F1A\u88AB\u66FF\u6362\u4E3A\u6458\u8981\u957F\u5EA6\uFF0C{content}\u4F1A\u88AB\u66FF\u6362\u4E3A\u6587\u6863\u5185\u5BB9").addTextArea((textArea) => textArea.setPlaceholder("\u8F93\u5165\u81EA\u5B9A\u4E49\u63D0\u793A").setValue(this.plugin.settings.customPrompt).onChange(async (value) => {
      this.plugin.settings.customPrompt = value;
      await this.plugin.saveSettings();
    }));
  }
};
