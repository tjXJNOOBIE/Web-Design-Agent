package org.tavall.webdesign.design.validation;

import java.net.Inet4Address;
import java.net.Inet6Address;
import java.net.InetAddress;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.UnknownHostException;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;

public final class WebDesignAgentBrowserTargetValidator {
    private static final Set<String> BLOCKED_HOSTNAMES = Set.of(
            "localhost",
            "metadata.google.internal"
    );
    private static final List<String> BLOCKED_HOSTNAME_SUFFIXES = List.of(
            ".localhost",
            ".local",
            ".internal",
            ".home.arpa"
    );
    private static final List<Network> BLOCKED_NETWORKS = List.of(
            network("0.0.0.0", 8),
            network("10.0.0.0", 8),
            network("100.64.0.0", 10),
            network("127.0.0.0", 8),
            network("169.254.0.0", 16),
            network("172.16.0.0", 12),
            network("192.0.0.0", 24),
            network("192.0.2.0", 24),
            network("192.88.99.0", 24),
            network("192.168.0.0", 16),
            network("198.18.0.0", 15),
            network("198.51.100.0", 24),
            network("203.0.113.0", 24),
            network("224.0.0.0", 4),
            network("240.0.0.0", 4),
            network("::", 128),
            network("::1", 128),
            network("::ffff:0:0", 96),
            network("64:ff9b::", 96),
            network("100::", 64),
            network("2001:10::", 28),
            network("2001:20::", 28),
            network("2001:db8::", 32),
            network("fc00::", 7),
            network("fe80::", 10),
            network("fec0::", 10),
            network("ff00::", 8)
    );

    private final DnsResolver dnsResolver;
    private final Set<Integer> allowedPorts;

    public WebDesignAgentBrowserTargetValidator() {
        this(WebDesignAgentBrowserTargetValidator::resolveDns, Set.of(80, 443));
    }

    public WebDesignAgentBrowserTargetValidator(DnsResolver dnsResolver, Set<Integer> allowedPorts) {
        this.dnsResolver = dnsResolver;
        this.allowedPorts = Set.copyOf(allowedPorts);
    }

    public String validate(String value, String label) {
        String normalizedValue = value == null ? "" : value.trim();
        if (normalizedValue.isEmpty()) {
            throw new DesignResultValidationException(label + " must be non-blank.");
        }
        if (normalizedValue.length() > WebDesignAgentRequestLimits.URL_CHARACTERS) {
            throw new DesignResultValidationException(
                    label + " exceeds the " + WebDesignAgentRequestLimits.URL_CHARACTERS + "-character URL limit."
            );
        }

        URI uri = parseUri(normalizedValue, label);
        String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
        if (!scheme.equals("http") && !scheme.equals("https")) {
            throw new DesignResultValidationException(label + " must use http or https.");
        }
        if (uri.getRawUserInfo() != null && !uri.getRawUserInfo().isEmpty()) {
            throw new DesignResultValidationException(label + " must not contain URL credentials.");
        }

        int port = uri.getPort() >= 0 ? uri.getPort() : scheme.equals("https") ? 443 : 80;
        if (!allowedPorts.contains(port)) {
            throw new DesignResultValidationException(
                    label + " uses a browser port that is not allowed by the public Web Design Agent policy."
            );
        }

        String hostname = normalizeHostname(uri.getHost());
        if (hostname.isEmpty() || isBlockedHostname(hostname)) {
            throw new DesignResultValidationException(label + " must resolve to a public internet host.");
        }

        Optional<InetAddress> literalAddress = literalAddress(hostname);
        if (literalAddress.isPresent()) {
            assertPublicAddress(literalAddress.orElseThrow(), label);
        } else {
            List<InetAddress> addresses;
            try {
                addresses = List.copyOf(dnsResolver.resolve(hostname));
            } catch (Exception exception) {
                throw new DesignResultValidationException(label + " hostname could not be resolved safely.", exception);
            }
            if (addresses.isEmpty()) {
                throw new DesignResultValidationException(label + " hostname did not resolve to an address.");
            }
            addresses.forEach(address -> assertPublicAddress(address, label));
        }

        return stripFragment(uri, label).toASCIIString();
    }

    private static URI parseUri(String value, String label) {
        try {
            URI uri = new URI(value);
            if (uri.getScheme() == null || uri.getHost() == null) {
                throw new URISyntaxException(value, "scheme and host are required");
            }
            return uri;
        } catch (URISyntaxException exception) {
            throw new DesignResultValidationException(label + " must be a valid URL.", exception);
        }
    }

    private static URI stripFragment(URI uri, String label) {
        try {
            return new URI(
                    uri.getScheme(),
                    uri.getRawUserInfo(),
                    uri.getHost(),
                    uri.getPort(),
                    uri.getRawPath(),
                    uri.getRawQuery(),
                    null
            );
        } catch (URISyntaxException exception) {
            throw new DesignResultValidationException(label + " must be a valid URL.", exception);
        }
    }

    private static String normalizeHostname(String hostname) {
        if (hostname == null) {
            return "";
        }
        String normalized = hostname.trim().toLowerCase(Locale.ROOT);
        if (normalized.endsWith(".")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        if (normalized.startsWith("[") && normalized.endsWith("]")) {
            return normalized.substring(1, normalized.length() - 1);
        }
        return normalized;
    }

    private static boolean isBlockedHostname(String hostname) {
        if (BLOCKED_HOSTNAMES.contains(hostname)) {
            return true;
        }
        return BLOCKED_HOSTNAME_SUFFIXES.stream().anyMatch(hostname::endsWith);
    }

    private static Optional<InetAddress> literalAddress(String hostname) {
        if (hostname.indexOf(':') >= 0) {
            try {
                InetAddress address = InetAddress.getByName(hostname);
                return address instanceof Inet6Address ? Optional.of(address) : Optional.empty();
            } catch (UnknownHostException exception) {
                return Optional.empty();
            }
        }
        if (!hostname.matches("[0-9.]+")) {
            return Optional.empty();
        }
        String[] parts = hostname.split("\\.", -1);
        if (parts.length != 4) {
            return Optional.empty();
        }
        byte[] bytes = new byte[4];
        try {
            for (int index = 0; index < parts.length; index++) {
                int part = Integer.parseInt(parts[index]);
                if (part < 0 || part > 255) {
                    return Optional.empty();
                }
                bytes[index] = (byte) part;
            }
            return Optional.of(InetAddress.getByAddress(bytes));
        } catch (NumberFormatException | UnknownHostException exception) {
            return Optional.empty();
        }
    }

    private static void assertPublicAddress(InetAddress address, String label) {
        if (!(address instanceof Inet4Address) && !(address instanceof Inet6Address)) {
            throw new DesignResultValidationException(label + " hostname returned an invalid address.");
        }
        boolean blocked = BLOCKED_NETWORKS.stream().anyMatch(network -> network.matches(address));
        if (blocked) {
            throw new DesignResultValidationException(
                    label + " must not resolve to a private, loopback, link-local, metadata, reserved, or multicast address."
            );
        }
    }

    private static List<InetAddress> resolveDns(String hostname) throws UnknownHostException {
        return List.of(InetAddress.getAllByName(hostname));
    }

    private static Network network(String address, int prefixLength) {
        try {
            return new Network(InetAddress.getByName(address).getAddress(), prefixLength);
        } catch (UnknownHostException exception) {
            throw new ExceptionInInitializerError(exception);
        }
    }

    @FunctionalInterface
    public interface DnsResolver {
        List<InetAddress> resolve(String hostname) throws Exception;
    }

    private record Network(byte[] address, int prefixLength) {
        private Network {
            address = Arrays.copyOf(address, address.length);
        }

        private boolean matches(InetAddress candidate) {
            byte[] candidateBytes = candidate.getAddress();
            if (candidateBytes.length != address.length) {
                return false;
            }
            int fullBytes = prefixLength / 8;
            int remainingBits = prefixLength % 8;
            for (int index = 0; index < fullBytes; index++) {
                if (candidateBytes[index] != address[index]) {
                    return false;
                }
            }
            if (remainingBits == 0) {
                return true;
            }
            int mask = 0xff << (8 - remainingBits);
            return (candidateBytes[fullBytes] & mask) == (address[fullBytes] & mask);
        }
    }
}
