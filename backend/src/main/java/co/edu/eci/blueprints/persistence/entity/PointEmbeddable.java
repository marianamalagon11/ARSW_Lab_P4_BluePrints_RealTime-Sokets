package co.edu.eci.blueprints.persistence.entity;

import jakarta.persistence.Embeddable;

@Embeddable
public class PointEmbeddable {
    private int x;
    private int y;

    public PointEmbeddable() {}

    public PointEmbeddable(int x, int y) {
        this.x = x;
        this.y = y;
    }

    public int getX() { return x; }
    public int getY() { return y; }
}
