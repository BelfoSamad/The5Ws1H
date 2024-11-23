export interface Expansion {
    question: string,
    answer: string
}

export interface Article {
    articleId: string,
    url: string,
    title: string,
    createdAt: Date,
    indexed: boolean,
    summary: Map<string, string>,
    expansion: Expansion[] | undefined
}