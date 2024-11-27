export interface Summary {
    what: string,
    who: string[],
    where: string[],
    why: string,
    when: string,
    how: string
}

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
    summary: Summary,
    expansion: Expansion[] | undefined
}