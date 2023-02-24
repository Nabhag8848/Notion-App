import {
    IHttp,
    IModify,
    IPersistence,
    IRead,
} from "@rocket.chat/apps-engine/definition/accessors";
import { IRoom } from "@rocket.chat/apps-engine/definition/rooms";
import {
    ISlashCommand,
    SlashCommandContext,
} from "@rocket.chat/apps-engine/definition/slashcommands";
import { NotionApp } from "../NotionApp";

export interface IButton {
    text: string;
    url?: string;
    actionId?: string;
}

export class NotionCommand implements ISlashCommand {
    public command: string = "notion";
    public i18nParamsExample: string = "";
    public i18nDescription: string =
        "Create pages and receive notifications of notion inside Rocket.Chat";
    public providesPreview: boolean = false;

    constructor(private readonly app: NotionApp) {}
    public async executor(
        context: SlashCommandContext,
        read: IRead,
        modify: IModify,
        http: IHttp,
        persis: IPersistence
    ): Promise<void> {
        //https://stackoverflow.com/questions/48519484/uncaught-syntaxerror-unexpected-eval-or-arguments-in-strict-mode-window-gtag
        const argument = context.getArguments()[0];

        switch (argument) {
            case "login": {
                const user = context.getSender();
                const url = await this.app
                    .getOAuth2ClientInstance()
                    .getUserAuthorizationUrl(user);

                const button: IButton = {
                    text: "Notion Login",
                    url: url.toString(),
                    actionId: "notion-login",
                };

                const sectionText = `Login to Notion`;

                const blocks = modify.getCreator().getBlockBuilder();

                blocks.addSectionBlock({
                    text: blocks.newMarkdownTextObject(sectionText),
                });

                blocks.addActionsBlock({
                    elements: [
                        blocks.newButtonElement({
                            actionId: button.actionId,
                            text: blocks.newPlainTextObject(button.text),
                            url: button.url,
                        }),
                    ],
                });

                const builder = await modify.getCreator().startMessage({
                    sender: user,
                    room: (await read
                        .getRoomReader()
                        .getByName("general")) as IRoom,
                    blocks: blocks.getBlocks(),
                });

                await modify
                    .getNotifier()
                    .notifyUser(user, builder.getMessage());
            }
            default: {
            }
        }
    }
}
