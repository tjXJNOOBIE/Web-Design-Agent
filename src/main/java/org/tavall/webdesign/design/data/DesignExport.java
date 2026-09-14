package org.tavall.webdesign.design.data;

import java.util.List;

public record DesignExport(
        String html,
        String css,
        String javascript,
        String standaloneHtml,
        List<PageExport> pages
) {
    public DesignExport {
        pages = List.copyOf(pages);
    }

    public record PageExport(
            String path,
            String title,
            String html,
            String javascript,
            String standaloneHtml
    ) {
    }
}
