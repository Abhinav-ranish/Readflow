import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: ['/api/', '/dashboard', '/s/*/edit', '/s/*/versions', '/s/*/analytics'],
            },
        ],
        sitemap: 'https://readflow.aranish.uk/sitemap.xml',
    };
}
