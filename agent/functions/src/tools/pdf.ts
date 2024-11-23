import axios from "axios";
import {JSDOM} from "jsdom";
import {Readability} from "@mozilla/readability";

export async function getContentFromUrl(url: string): Promise<any> {
    return axios.get(url).then((response: {data: any;}) => {
        const dom = new JSDOM(response.data, {url});
        const reader = new Readability(dom.window.document);
        const article = reader.parse();

        if (article) {
            return {
                title: article.title,
                content: article.textContent,
            };
        } else {
            throw Error("Could not extract article content.");
        }
    })
        .catch((error: any) => {
            throw Error("Error fetching the page: " + error);
        });
}
