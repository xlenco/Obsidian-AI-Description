import { App, Editor, MarkdownView, MarkdownFileInfo, Notice, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';

// 定义插件设置接口
interface AutoDescriptionSettings {
  apiProvider: string;
  apiKey: string;
  apiUrl: string;
  model: string;
  summaryLength: number;
  customPrompt: string;
}

// 默认设置
const DEFAULT_SETTINGS: AutoDescriptionSettings = {
  apiProvider: 'openai',
  apiKey: '',
  apiUrl: 'https://api.openai.com/v1/chat/completions',
  model: 'gpt-3.5-turbo',
  summaryLength: 150,
  customPrompt: '请为以下文本生成一个{length}字以内的简要摘要: \n\n{content}'
};

// 主插件类
export default class AutoDescriptionPlugin extends Plugin {
  settings!: AutoDescriptionSettings; // 使用!断言属性会被初始化

  async onload() {
    await this.loadSettings();

    // 添加命令
    this.addCommand({
      id: 'generate-description',
      name: '生成文档摘要',
      editorCallback: async (editor: Editor, ctx: MarkdownView | MarkdownFileInfo) => {
        // 确保ctx是MarkdownView类型
        if (ctx instanceof MarkdownView) {
          await this.generateDescription(editor);
        } else {
          new Notice('请在编辑器中使用此命令');
        }
      }
    });

    // 添加设置选项卡
    this.addSettingTab(new AutoDescriptionSettingTab(this.app, this));
  }

  async loadSettings() {
    this.settings = { ...DEFAULT_SETTINGS, ...await this.loadData() };
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  // 调用AI API生成摘要
  async callAI(content: string): Promise<string> {
    if (!this.settings.apiKey) {
      new Notice('请先在设置中配置API密钥');
      return '';
    }

    if (!this.settings.apiUrl) {
      new Notice('请先在设置中配置API URL');
      return '';
    }

    try {
      const prompt = this.settings.customPrompt
        .replace('{length}', this.settings.summaryLength.toString())
        .replace('{content}', content);

      // 构建请求体，根据不同提供商可能需要调整
      let requestBody: any = {
        model: this.settings.model,
        messages: [
          {
            role: 'system',
            content: '你是一个专业的文章摘要生成助手，擅长提炼文章核心内容。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: Math.max(100, Math.min(500, this.settings.summaryLength * 2))
      };

      // 针对特定提供商的特殊处理
      if (this.settings.apiProvider === 'kimi') {
        // Kimi API可能需要不同的参数格式
        requestBody = {
          model: this.settings.model,
          messages: [
            {
              role: 'system',
              content: '你是一个专业的文章摘要生成助手，擅长提炼文章核心内容。'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.6
        };
      } else if (this.settings.apiProvider === 'deepseek') {
        // DeepSeek API可能需要不同的参数格式
        requestBody = {
          model: this.settings.model,
          messages: [
            {
              role: 'system',
              content: '你是一个专业的文章摘要生成助手，擅长提炼文章核心内容。'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: Math.max(100, Math.min(500, this.settings.summaryLength * 2))
        };
      }

      const response = await fetch(this.settings.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.settings.apiKey}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API错误: ${errorData.error?.message || errorData.message || '未知错误'}`);
      }

      const data = await response.json();
      // 提取响应中的摘要内容，不同提供商可能有不同的响应格式
      let summary = '';
      if (data.choices && data.choices.length > 0) {
        summary = data.choices[0]?.message?.content?.trim() || '';
      } else if (data.result) {
        summary = data.result.trim();
      }

      return summary || '无法生成摘要';
    } catch (error) {
      console.error('调用AI API失败:', error);
      new Notice(`生成摘要失败: ${(error as Error).message}`);
      return '';
    }
  }

  // 生成并插入摘要
  async generateDescription(editor: Editor) {
    const content = editor.getValue();

    if (!content.trim()) {
      new Notice('文档内容为空，无法生成摘要');
      return;
    }

    new Notice('正在生成摘要...');

    try {
      // 提取文档内容（去除Front Matter，如果有的话）
      const cleanContent = this.extractContent(content);
      const summary = await this.callAI(cleanContent);

      if (summary) {
        this.insertSummaryToFrontMatter(editor, summary);
        new Notice('摘要已成功添加到Front Matter');
      }
    } catch (error) {
      console.error('生成摘要失败:', error);
      // 为error添加类型断言
      new Notice(`生成摘要失败: ${(error as Error).message}`);
    }
  }

  // 提取文档内容（去除Front Matter）
  extractContent(content: string): string {
    const frontMatterRegex = /^---\s*\n([\s\S]*?)\s*---\s*\n/;
    const match = content.match(frontMatterRegex);

    if (match) {
      return content.replace(frontMatterRegex, '').trim();
    }

    return content.trim();
  }

  // 将摘要插入到Front Matter
  insertSummaryToFrontMatter(editor: Editor, summary: string) {
    const content = editor.getValue();
    const frontMatterRegex = /^---\s*\n([\s\S]*?)\s*---\s*\n/;
    const match = content.match(frontMatterRegex);
    let newContent = content;

    // 处理多行摘要的YAML转义
    const escapedSummary = summary
      .replace(/\n/g, '\n  ')  // 每行前添加缩进
      .replace(/"/g, '\\"');  // 转义双引号

    if (match) {
      const frontMatter = match[1];
      const descriptionRegex = /description:\s*(.*?)(\n|$)/m;
      const frontMatterMatch = frontMatter.match(descriptionRegex);

      if (frontMatterMatch) {
        // 有description字段，替换它
        const updatedFrontMatter = frontMatter.replace(
          descriptionRegex,
          `description: "${escapedSummary}"`
        );
        newContent = content.replace(frontMatterRegex, `---\n${updatedFrontMatter}\n---\n`);
      } else {
        // 没有description字段，添加它
        const updatedFrontMatter = `${frontMatter}\ndescription: "${escapedSummary}"`;
        newContent = content.replace(frontMatterRegex, `---\n${updatedFrontMatter}\n---\n`);
      }
    } else {
      // 没有Front Matter，创建一个新的
      newContent = `---\ndescription: "${escapedSummary}"\n---\n${content}`;
    }

    // 更新编辑器内容
    editor.setValue(newContent);
  }
}

// 设置选项卡类
class AutoDescriptionSettingTab extends PluginSettingTab {
  plugin: AutoDescriptionPlugin;

  constructor(app: App, plugin: AutoDescriptionPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();
    containerEl.createEl('h2', { text: 'AI 摘要生成设置' });

    // AI提供商选择
    new Setting(containerEl)
      .setName('AI提供商')
      .setDesc('选择要使用的AI服务提供商')
      .addDropdown(dropdown => dropdown
        .addOption('openai', 'OpenAI')
        .addOption('deepseek', 'DeepSeek')
        .addOption('kimi', 'Kimi')
        .addOption('custom', '自定义')
        .setValue(this.plugin.settings.apiProvider)
        .onChange(async (value) => {
          this.plugin.settings.apiProvider = value;
          // 根据选择的提供商设置默认API URL
          if (value === 'openai') {
            this.plugin.settings.apiUrl = 'https://api.openai.com/v1/chat/completions';
            this.plugin.settings.model = 'gpt-3.5-turbo';
          } else if (value === 'deepseek') {
            this.plugin.settings.apiUrl = 'https://api.deepseek.com/v1/chat/completions';
            this.plugin.settings.model = 'deepseek-chat';
          } else if (value === 'kimi') {
            this.plugin.settings.apiUrl = 'https://api.moonshot.cn/v1/chat/completions';
            this.plugin.settings.model = 'moonshot-v1-8k';
          }
          await this.plugin.saveSettings();
          // 刷新设置界面以更新相关字段
          this.display();
        }));

    // API URL设置
    new Setting(containerEl)
      .setName('API URL')
      .setDesc('AI服务的API端点URL')
      .addText(text => text
        .setPlaceholder('输入API URL')
        .setValue(this.plugin.settings.apiUrl)
        .onChange(async (value) => {
          this.plugin.settings.apiUrl = value;
          await this.plugin.saveSettings();
        }));

    // API密钥设置
    new Setting(containerEl)
      .setName('API密钥')
      .setDesc('访问AI服务所需的API密钥')
      .addText(text => text
        .setPlaceholder('输入API密钥')
        .setValue(this.plugin.settings.apiKey)
        .onChange(async (value) => {
          this.plugin.settings.apiKey = value;
          await this.plugin.saveSettings();
        }));

    // 模型选择
    new Setting(containerEl)
      .setName('模型')
      .setDesc('选择要使用的AI模型')
      .addText(text => text
        .setPlaceholder('输入模型名称')
        .setValue(this.plugin.settings.model)
        .onChange(async (value) => {
          this.plugin.settings.model = value;
          await this.plugin.saveSettings();
        }));

    // 摘要长度设置
    new Setting(containerEl)
      .setName('摘要长度')
      .setDesc('生成的摘要大致字数')
      .addSlider(slider => slider
        .setLimits(50, 500, 10)
        .setValue(this.plugin.settings.summaryLength)
        .setDynamicTooltip()
        .onChange(async (value) => {
          this.plugin.settings.summaryLength = value;
          await this.plugin.saveSettings();
        }));

    // 自定义提示设置
    new Setting(containerEl)
      .setName('自定义提示')
      .setDesc('生成摘要的提示模板，{length}会被替换为摘要长度，{content}会被替换为文档内容')
      .addTextArea(textArea => textArea
        .setPlaceholder('输入自定义提示')
        .setValue(this.plugin.settings.customPrompt)
        .onChange(async (value) => {
          this.plugin.settings.customPrompt = value;
          await this.plugin.saveSettings();
        }));
  }
}