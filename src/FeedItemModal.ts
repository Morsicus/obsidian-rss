import {
    App,
    ButtonComponent,
    htmlToMarkdown,
    MarkdownView,
    Modal,
    normalizePath,
    Notice,
} from "obsidian";
import {RssFeedItem} from "./rssParser";

export class FeedItemModal extends Modal {

    private readonly item: RssFeedItem;

    constructor(app: App, item: RssFeedItem) {
        super(app);
        this.item = item;
    }

    onOpen() {
        let {contentEl} = this;
        let title = contentEl.createEl('h1', 'title');
        title.setText(this.item.title);

        let subtitle = contentEl.createEl("h3", "subtitle");
        if(this.item.creator) {
            subtitle.appendText(this.item.creator);
        }
        if(this.item.pubDate) {
            subtitle.appendText(" - " + this.item.pubDate);
        }


        let content = contentEl.createDiv('content');
        if (this.item.content) {
            content.innerHTML = this.item.content;
        }

        let buttonsEl = contentEl.createDiv();

        new ButtonComponent(buttonsEl).setButtonText("open in browser").onClick(() => {
            console.log(this.item.link);
            if (typeof this.item.link === "string") {
                window.open(this.item.link, '_blank');
            }
        });

        new ButtonComponent(buttonsEl).setButtonText("Add as new note").onClick(async () => {
            const activeFile = this.app.workspace.getActiveFile();
            const dir = this.app.fileManager.getNewFileParent(activeFile ? activeFile.path : "").name;
            const title = this.item.title.replace(/[\/\\\:]/g, ' ');
            const filePath = normalizePath([dir, `${title}.md`].join('/'));
            let content = htmlToMarkdown(this.item.content);
            //todo: configure header via template in settings
            const header = "---\n" +
                "link: " + this.item.link + "\n" +
                "author: " + this.item.creator + "\n" +
                "pubDate: " + this.item.pubDate + "\n" +
                "---\n";

            if (this.app.vault.getAbstractFileByPath(filePath)) {
                new Notice("there is already a file with that name");
                return;
            }
            const file = await this.app.vault.create(filePath, header + content);
            const view = this.app.workspace.getActiveViewOfType(MarkdownView);
            if (view) {
                await view.leaf.openFile(file, {
                    state: {mode: 'preview'},
                })
            }
            new Notice("Created note from feed");
        });

        new ButtonComponent(buttonsEl).setButtonText("paste to current note").onClick(() => {
            const file = this.app.workspace.getActiveFile();
            if (file === null) {
                new Notice("no file active");
                return;
            }

            const view = this.app.workspace.getActiveViewOfType(MarkdownView);
            if (view) {
                const editor = view.editor;
                editor.replaceRange(htmlToMarkdown(this.item.content), editor.getCursor());
                new Notice("inserted feed item into note");
            }
        });

    }

    onClose() {
        let {contentEl} = this;
        contentEl.empty();
    }
}