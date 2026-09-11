package org.tavall.webdesign.design.validation;

import org.junit.jupiter.api.Test;

import java.net.InetAddress;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class WebDesignAgentBrowserTargetValidatorTest {
    @Test
    void rejectsDirectPrivateAndMetadataTargets() {
        WebDesignAgentBrowserTargetValidator validator = new WebDesignAgentBrowserTargetValidator();

        assertThatThrownBy(() -> validator.validate("http://127.0.0.1/test", "targetUrl"))
                .isInstanceOf(DesignResultValidationException.class)
                .hasMessageContaining("must not resolve");
        assertThatThrownBy(() -> validator.validate("http://metadata.google.internal/", "targetUrl"))
                .isInstanceOf(DesignResultValidationException.class)
                .hasMessageContaining("public internet host");
    }

    @Test
    void rejectsHostnameWhenAnyDnsAnswerIsPrivate() throws Exception {
        WebDesignAgentBrowserTargetValidator validator = new WebDesignAgentBrowserTargetValidator(
                ignored -> List.of(
                        InetAddress.getByName("93.184.216.34"),
                        InetAddress.getByName("10.0.0.7")
                ),
                Set.of(80, 443)
        );

        assertThatThrownBy(() -> validator.validate("https://example.com/", "targetUrl"))
                .isInstanceOf(DesignResultValidationException.class)
                .hasMessageContaining("must not resolve");
    }

    @Test
    void acceptsPublicHostAndRemovesFragment() throws Exception {
        WebDesignAgentBrowserTargetValidator validator = new WebDesignAgentBrowserTargetValidator(
                ignored -> List.of(InetAddress.getByName("93.184.216.34")),
                Set.of(80, 443)
        );

        assertThat(validator.validate("https://example.com/path?q=1#private-fragment", "targetUrl"))
                .isEqualTo("https://example.com/path?q=1");
    }

    @Test
    void rejectsCredentialsAndNonPublicPorts() throws Exception {
        WebDesignAgentBrowserTargetValidator validator = new WebDesignAgentBrowserTargetValidator(
                ignored -> List.of(InetAddress.getByName("93.184.216.34")),
                Set.of(80, 443)
        );

        assertThatThrownBy(() -> validator.validate("https://user:secret@example.com/", "targetUrl"))
                .isInstanceOf(DesignResultValidationException.class)
                .hasMessageContaining("credentials");
        assertThatThrownBy(() -> validator.validate("https://example.com:8443/", "targetUrl"))
                .isInstanceOf(DesignResultValidationException.class)
                .hasMessageContaining("port");
    }
}
