package org.tavall.webdesign.design.validation;

import org.tavall.webdesign.design.data.DesignCandidate;
import org.tavall.webdesign.design.data.DesignCandidateId;
import org.tavall.webdesign.design.data.DesignGenome;

import java.util.ArrayList;
import java.util.List;

public final class DesignDistanceEvaluator {
    private final double minimumDistance;

    public DesignDistanceEvaluator() {
        this(0.45);
    }

    public DesignDistanceEvaluator(double minimumDistance) {
        if (!Double.isFinite(minimumDistance) || minimumDistance < 0.0 || minimumDistance > 1.0) {
            throw new IllegalArgumentException("minimumDistance must be between 0 and 1");
        }
        this.minimumDistance = minimumDistance;
    }

    public Result evaluate(List<DesignCandidate> candidates) {
        if (candidates.size() != 3) {
            return new Result(false, List.of());
        }

        List<Pair> pairs = new ArrayList<>(3);
        addPair(pairs, candidates.get(0), candidates.get(1));
        addPair(pairs, candidates.get(0), candidates.get(2));
        addPair(pairs, candidates.get(1), candidates.get(2));
        return new Result(pairs.size() == 3 && pairs.stream().allMatch(Pair::passed), pairs);
    }

    private void addPair(List<Pair> pairs, DesignCandidate left, DesignCandidate right) {
        double distance = distance(left.genome(), right.genome());
        pairs.add(new Pair(left.id(), right.id(), distance, distance >= minimumDistance));
    }

    private static double distance(DesignGenome left, DesignGenome right) {
        int score = 0;
        score += same(left.composition(), right.composition()) ? 0 : 1;
        score += same(left.navigation(), right.navigation()) ? 0 : 1;
        score += same(left.heroStrategy(), right.heroStrategy()) ? 0 : 1;
        score += same(left.typography(), right.typography()) ? 0 : 1;
        score += same(left.geometry(), right.geometry()) ? 0 : 1;
        score += same(left.surfaceModel(), right.surfaceModel()) ? 0 : 1;
        score += same(left.motion(), right.motion()) ? 0 : 1;
        score += same(left.contentRhythm(), right.contentRhythm()) ? 0 : 1;
        score += same(left.imageryStrategy(), right.imageryStrategy()) ? 0 : 1;

        double normalized = score;
        normalized += Math.min(1.0, Math.abs(left.density() - right.density()) * 2.0);
        normalized += Math.min(1.0, Math.abs(left.depth() - right.depth()) * 2.0);
        return normalized / 11.0;
    }

    private static boolean same(String left, String right) {
        return left.equals(right);
    }

    public record Pair(
            DesignCandidateId left,
            DesignCandidateId right,
            double distance,
            boolean passed
    ) {
    }

    public record Result(boolean passed, List<Pair> pairs) {
        public Result {
            pairs = List.copyOf(pairs);
        }
    }
}
