package org.tavall.webdesign.cli;

public final class WebDesignCliInputException extends IllegalArgumentException {
    public WebDesignCliInputException() {
        this("Web Design Agent requires a non-blank request.");
    }

    public WebDesignCliInputException(String message) {
        super(message);
    }
}
