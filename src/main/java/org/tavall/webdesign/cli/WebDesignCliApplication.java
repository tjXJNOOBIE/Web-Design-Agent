package org.tavall.webdesign.cli;

import org.tavall.webdesign.application.WebDesignApplicationServices;
import org.tavall.webdesign.application.WebDesignApplicationServicesBuilder;
import org.tavall.webdesign.design.data.DesignGenerationRequest;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;

public final class WebDesignCliApplication {
    private WebDesignCliApplication() {
    }

    public static void main(String[] args) {
        try {
            WebDesignApplicationServices services = new WebDesignApplicationServicesBuilder(System.getenv()).build();
            DesignGenerationRequest request = new WebDesignCliRequestResolver().resolve(
                    List.copyOf(Arrays.asList(args)),
                    stdinFallback(args)
            );
            String output = new WebDesignCliHandler(
                    services.generationHandler(),
                    services.objectMapper()
            ).handle(request);
            System.out.println(output);
        } catch (RuntimeException | IOException exception) {
            System.err.println(exception.getMessage() == null ? exception.getClass().getSimpleName() : exception.getMessage());
            System.exit(1);
        }
    }

    private static String stdinFallback(String[] args) throws IOException {
        if (args.length != 0 || System.console() != null) {
            return "";
        }
        return new String(System.in.readAllBytes(), StandardCharsets.UTF_8).trim();
    }
}
