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
import { IUser } from "@rocket.chat/apps-engine/definition/users";
import { removeToken } from "../persistance/auth";
import { CommandParameter } from "../enums/Parameter";

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
        const argument = context.getArguments()[0];

        switch (argument) {
            case CommandParameter.LOGIN: {
                const user = (await read.getUserReader().getAppUser()) as IUser;
                const url = await this.app
                    .getOAuth2ClientInstance()
                    .getUserAuthorizationUrl(context.getSender());

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
                    .notifyUser(context.getSender(), builder.getMessage());
                break;
            }
            case CommandParameter.TEST: {
                const user = (await read.getUserReader().getAppUser()) as IUser;
                const token = await this.app
                    .getOAuth2ClientInstance()
                    .getAccessTokenForUser(context.getSender());

                if (token) {
                    const builder = await modify.getCreator().startMessage({
                        sender: user,
                        room: (await read
                            .getRoomReader()
                            .getByName("general")) as IRoom,
                        text: "Is already loggedin",
                    });
                    await modify
                        .getNotifier()
                        .notifyUser(context.getSender(), builder.getMessage());
                } else {
                    const builder = await modify.getCreator().startMessage({
                        sender: user,
                        room: (await read
                            .getRoomReader()
                            .getByName("general")) as IRoom,
                        text: "Not Logged In",
                    });
                    await modify
                        .getNotifier()
                        .notifyUser(context.getSender(), builder.getMessage());
                }

                break;
            }

            case CommandParameter.LOGOUT: {
                const user = (await read.getUserReader().getAppUser()) as IUser;
                const isRevoked = await removeToken({
                    userId: user.id,
                    persis,
                    config: this.app.OAuth2Config,
                });

                if (isRevoked) {
                    const builder = await modify.getCreator().startMessage({
                        sender: user,
                        room: (await read
                            .getRoomReader()
                            .getByName("general")) as IRoom,
                        text: "Revoked",
                    });
                    await modify
                        .getNotifier()
                        .notifyUser(context.getSender(), builder.getMessage());
                } else {
                    const builder = await modify.getCreator().startMessage({
                        sender: user,
                        room: (await read
                            .getRoomReader()
                            .getByName("general")) as IRoom,
                        text: "Not Revoked",
                    });
                    await modify
                        .getNotifier()
                        .notifyUser(context.getSender(), builder.getMessage());
                }

                break;
            }
            default: {
                
            }
        }
    }
}
