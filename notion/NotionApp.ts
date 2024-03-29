import {
    IAppAccessors,
    IConfigurationExtend,
    IEnvironmentRead,
    IHttp,
    ILogger,
    IModify,
    IPersistence,
    IRead,
} from "@rocket.chat/apps-engine/definition/accessors";
import { App } from "@rocket.chat/apps-engine/definition/App";
import { IAppInfo } from "@rocket.chat/apps-engine/definition/metadata";
import {
    IAuthData,
    IOAuth2Client,
} from "@rocket.chat/apps-engine/definition/oauth2/IOAuth2";
import { IOAuth2ClientOptions } from "@rocket.chat/apps-engine/definition/oauth2/IOAuth2";
import { IUser } from "@rocket.chat/apps-engine/definition/users";
import { NotionCommand } from "./commands/NotionCommand";
import { createOAuth2Client } from "@rocket.chat/apps-engine/definition/oauth2/OAuth2";
import { IRoom } from "@rocket.chat/apps-engine/definition/rooms";
import {
    IUIKitResponse,
    UIKitBlockInteractionContext,
} from "@rocket.chat/apps-engine/definition/uikit";

export class NotionApp extends App {
    private OAuth2ClientInstance: IOAuth2Client;
    public OAuth2Config: IOAuth2ClientOptions = {
        alias: "notion",
        accessTokenUri: "https://api.notion.com/v1/oauth/token",
        authUri: "https://api.notion.com/v1/oauth/authorize",
        refreshTokenUri: "https://api.notion.com/v1/oauth/token",
        revokeTokenUri: "https://api.notion.com/v1/users/me",
        authorizationCallback: this.authorizationCallback.bind(this),
        defaultScopes: ["users"],
    };

    constructor(info: IAppInfo, logger: ILogger, accessors: IAppAccessors) {
        super(info, logger, accessors);
    }

    public getOAuth2ClientInstance(): IOAuth2Client {
        if (!this.OAuth2ClientInstance) {
            this.OAuth2ClientInstance = createOAuth2Client(
                this,
                this.OAuth2Config
            );
        }
        return this.OAuth2ClientInstance;
    }

    public async authorizationCallback(
        token: IAuthData,
        user: IUser,
        read: IRead,
        modify: IModify,
        http: IHttp,
        persis: IPersistence
    ) {
        const bot = (await read.getUserReader().getAppUser()) as IUser;

        if (token) {
            const builder = await modify.getCreator().startMessage({
                room: (await read
                    .getRoomReader()
                    .getByName("general")) as IRoom,
                sender: bot,
                text: "Succesfully logged in!",
            });

            await modify.getNotifier().notifyUser(user, builder.getMessage());
        } else {
            const builder = await modify.getCreator().startMessage({
                room: (await read
                    .getRoomReader()
                    .getByName("general")) as IRoom,
                sender: bot,
                text: "Authorization Failed",
            });

            await modify.getNotifier().notifyUser(user, builder.getMessage());
        }
    }

    public async executeBlockActionHandler(
        context: UIKitBlockInteractionContext,
        read: IRead,
        http: IHttp,
        persistence: IPersistence,
        modify: IModify
    ): Promise<IUIKitResponse> {
        return context.getInteractionResponder().successResponse();
    }

    protected async extendConfiguration(
        configuration: IConfigurationExtend,
        environmentRead: IEnvironmentRead
    ): Promise<void> {
        const notionCommand: NotionCommand = new NotionCommand(this);
        await Promise.all([
            configuration.slashCommands.provideSlashCommand(notionCommand),
            this.getOAuth2ClientInstance().setup(configuration),
        ]);
    }
}
