export interface Summary {
    what: string,
    who: string[],
    where: string[],
    why: string,
    when: string,
    how: string
}

export interface Article {
    articleId: string,
    url: string,
    title: string,
    createdAt: Date,
    summary: Summary,
    translation: Summary | undefined,
    text_summary: string | undefined
}