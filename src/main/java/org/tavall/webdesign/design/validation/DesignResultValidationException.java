package org.tavall.webdesign.design.validation;

public final class DesignResultValidationException extends RuntimeException {
    public DesignResultValidationException(String message) {
        super(message);
    }

    public DesignResultValidationException(String message, Throwable cause) {
        super(message, cause);
    }
}
