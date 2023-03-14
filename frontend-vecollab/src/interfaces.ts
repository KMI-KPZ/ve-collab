export interface Category {
    name: string,
    slug: string
}
export interface Categories {
    edges: [
        {
            node: Category
        }
    ]
}

export interface PostPreview {
    title: string,
    excerpt: string,
    slug: string
}

export interface Post {
    title: string,
    excerpt: string,
    slug: string,
    date: string,
    content: string,
    tags: {
        edges: [
            { node: Tag }
        ]
    }
}

export interface Tag {
    name: string
}