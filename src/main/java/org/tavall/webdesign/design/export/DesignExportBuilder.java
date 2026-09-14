package org.tavall.webdesign.design.export;

import org.tavall.webdesign.design.data.DesignCandidate;
import org.tavall.webdesign.design.data.DesignExport;
import org.tavall.webdesign.design.data.VisualState;

import java.util.List;

public final class DesignExportBuilder {
    public DesignExport build(DesignCandidate candidate, VisualState visualState) {
        String home = buildStandalone(
                candidate.document().html(),
                candidate.document().css(),
                candidate.document().javascript(),
                visualState,
                candidate.title()
        );
        List<DesignExport.PageExport> pages = candidate.pages().stream()
                .map(page -> new DesignExport.PageExport(
                        page.path(),
                        page.title(),
                        page.html(),
                        page.javascript(),
                        buildStandalone(
                                page.html(),
                                candidate.document().css(),
                                page.javascript(),
                                visualState,
                                page.title()
                        )
                ))
                .toList();
        return new DesignExport(
                candidate.document().html(),
                candidate.document().css(),
                candidate.document().javascript(),
                home,
                pages
        );
    }

    private static String buildStandalone(
            String html,
            String css,
            String javascript,
            VisualState visualState,
            String title
    ) {
        String root = ":root{"
                + "--wda-density:" + visualState.density() + ";"
                + "--wda-spacing:" + visualState.spacingScale() + ";"
                + "--wda-radius:" + visualState.radius() + "px;"
                + "--wda-font-scale:" + visualState.fontScale() + ";"
                + "--wda-hero-scale:" + visualState.heroScale() + ";"
                + "--wda-contrast:" + visualState.contrast() + ";"
                + "--wda-depth:" + visualState.depth() + ";"
                + "--wda-motion:" + visualState.motion() + ";} ";
        String script = javascript.replace("</script", "<\\/script");
        return "<!doctype html><html><head><meta charset=\"utf-8\">"
                + "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">"
                + "<title>" + escapeHtml(title) + "</title>"
                + "<style>" + root + "\n" + css + "</style></head><body>"
                + html
                + (script.isEmpty() ? "" : "<script>" + script + "</script>")
                + "</body></html>";
    }

    private static String escapeHtml(String value) {
        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }
}
