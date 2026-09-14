package org.tavall.webdesign.agent;

import org.tavall.ai.agent.strands.StrandsAgentProviderConfiguration;
import org.tavall.ai.agent.strands.StrandsAgentToolReference;
import org.tavall.ai.agent.strands.StrandsBridgeMcpClient;
import org.tavall.ai.agent.strands.StrandsInvocationLimits;
import org.tavall.ai.agent.strands.StrandsObservedInvocationResult;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Lifecycle owner for WDA's native Strands specialist graph.
 * Java owns which roles exist; the standalone bridge turns references into native agent tools.
 */
public final class WebDesignStrandsGraphRuntime implements AutoCloseable {
    public static final String CANDIDATE_A_ID = "web-design-agent-candidate-a";
    public static final String CANDIDATE_B_ID = "web-design-agent-candidate-b";
    public static final String CANDIDATE_C_ID = "web-design-agent-candidate-c";
    public static final String CRITIC_ID = "web-design-agent-critic";
    public static final String CONCEPT_ID = "web-design-agent-concept";
    public static final String DIRECTOR_ID = "web-design-agent-director";

    private final StrandsAgentProviderConfiguration bridgeConfiguration;
    private final WebDesignAgentRoleConfigurationBuilder roleConfigurationBuilder;
    private final List<String> createdAgentIds = new ArrayList<>();
    private final AtomicBoolean started = new AtomicBoolean();
    private final AtomicBoolean closed = new AtomicBoolean();
    private StrandsBridgeMcpClient bridgeClient;

    public WebDesignStrandsGraphRuntime(
            StrandsAgentProviderConfiguration bridgeConfiguration,
            WebDesignAgentRoleConfigurationBuilder roleConfigurationBuilder
    ) {
        this.bridgeConfiguration = Objects.requireNonNull(bridgeConfiguration, "bridgeConfiguration");
        this.roleConfigurationBuilder = Objects.requireNonNull(roleConfigurationBuilder, "roleConfigurationBuilder");
    }

    public void start() {
        if (closed.get()) {
            throw new IllegalStateException("Web Design Agent Strands graph is closed");
        }
        if (!started.compareAndSet(false, true)) {
            throw new IllegalStateException("Web Design Agent Strands graph is already started");
        }

        bridgeClient = new StrandsBridgeMcpClient(bridgeConfiguration);
        try {
            create(CANDIDATE_A_ID, roleConfigurationBuilder.candidate("A"));
            create(CANDIDATE_B_ID, roleConfigurationBuilder.candidate("B"));
            create(CANDIDATE_C_ID, roleConfigurationBuilder.candidate("C"));
            create(CRITIC_ID, roleConfigurationBuilder.critic());

            List<StrandsAgentToolReference> directorTools = new ArrayList<>();
            directorTools.add(new StrandsAgentToolReference(
                    CANDIDATE_A_ID,
                    "candidate_a",
                    "Build or refine candidate A."
            ));
            directorTools.add(new StrandsAgentToolReference(
                    CANDIDATE_B_ID,
                    "candidate_b",
                    "Build or refine candidate B."
            ));
            directorTools.add(new StrandsAgentToolReference(
                    CANDIDATE_C_ID,
                    "candidate_c",
                    "Build or refine candidate C."
            ));
            directorTools.add(new StrandsAgentToolReference(
                    CRITIC_ID,
                    "visual_critic",
                    "Critique candidate evidence without implementing."
            ));

            if (roleConfigurationBuilder.capabilities().conceptImages()) {
                create(CONCEPT_ID, roleConfigurationBuilder.conceptArtist());
                directorTools.add(new StrandsAgentToolReference(
                        CONCEPT_ID,
                        "concept_artist",
                        "Generate real concept images when concept-first design is requested."
                ));
            }

            bridgeClient.createAgent(roleConfigurationBuilder.director(), List.copyOf(directorTools));
            createdAgentIds.add(DIRECTOR_ID);
        } catch (RuntimeException startupFailure) {
            RuntimeException failure = closeCreated(startupFailure);
            closeBridge(failure);
            closed.set(true);
            throw failure;
        }
    }

    public String invokeDirector(String input) {
        ensureUsable();
        return bridgeClient.invokeAgent(DIRECTOR_ID, Objects.requireNonNull(input, "input"));
    }

    public StrandsObservedInvocationResult invokeDirectorObserved(String input) {
        ensureUsable();
        WebDesignAgentRoleConfigurationBuilder.WebDesignInvocationPolicy policy =
                roleConfigurationBuilder.invocationPolicy();
        return bridgeClient.invokeAgentObserved(
                DIRECTOR_ID,
                Objects.requireNonNull(input, "input"),
                new StrandsInvocationLimits(
                        policy.maxTurns(),
                        policy.maxOutputTokens(),
                        policy.maxTotalTokens()
                )
        );
    }

    public void cancelDirector() {
        ensureUsable();
        bridgeClient.cancelAgent(DIRECTOR_ID);
    }

    public List<String> activeAgentIds() {
        ensureUsable();
        return List.copyOf(createdAgentIds);
    }

    @Override
    public void close() {
        if (!closed.compareAndSet(false, true)) {
            return;
        }

        RuntimeException failure = closeCreated(null);
        failure = closeBridge(failure);
        if (failure != null) {
            throw failure;
        }
    }

    private void create(String expectedAgentId, java.util.Map<String, Object> runtimeConfig) {
        bridgeClient.createAgent(runtimeConfig);
        createdAgentIds.add(expectedAgentId);
    }

    private RuntimeException closeCreated(RuntimeException failure) {
        if (bridgeClient == null) {
            return failure;
        }
        for (int index = createdAgentIds.size() - 1; index >= 0; index--) {
            String agentId = createdAgentIds.get(index);
            try {
                bridgeClient.closeAgent(agentId);
            } catch (RuntimeException closeFailure) {
                failure = appendFailure(failure, closeFailure);
            }
        }
        createdAgentIds.clear();
        return failure;
    }

    private RuntimeException closeBridge(RuntimeException failure) {
        StrandsBridgeMcpClient client = bridgeClient;
        bridgeClient = null;
        if (client == null) {
            return failure;
        }
        try {
            client.close();
        } catch (RuntimeException closeFailure) {
            return appendFailure(failure, closeFailure);
        }
        return failure;
    }

    private void ensureUsable() {
        if (!started.get() || closed.get() || bridgeClient == null) {
            throw new IllegalStateException("Web Design Agent Strands graph is not active");
        }
    }

    private static RuntimeException appendFailure(RuntimeException current, RuntimeException next) {
        if (current == null) {
            return next;
        }
        current.addSuppressed(next);
        return current;
    }
}
