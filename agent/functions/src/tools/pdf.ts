import axios from "axios";
import {JSDOM} from "jsdom";
import {Readability} from "@mozilla/readability";

interface Content {
    title: string,
    content: string
}

export async function getContentFromUrl(url: string): Promise<Content> {
    return axios.get(url).then((res) => {
        const dom = new JSDOM(res.data, {url});
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
    }).catch((error: Error) => {
        throw Error("Error fetching the page: " + error);
    });
}
