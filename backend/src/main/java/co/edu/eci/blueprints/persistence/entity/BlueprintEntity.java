package co.edu.eci.blueprints.persistence.entity;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "blueprints")
public class BlueprintEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String author;
    private String name;

    @ElementCollection
    @CollectionTable(name = "blueprint_points", joinColumns = @JoinColumn(name = "blueprint_id"))
    private List<PointEmbeddable> points = new ArrayList<>();

    public BlueprintEntity() {} // JPA exige constructor vacío

    public BlueprintEntity(String author, String name, List<PointEmbeddable> points) {
        this.author = author;
        this.name = name;
        this.points = points;
    }

    public Long getId() { return id; }
    public String getAuthor() { return author; }
    public String getName() { return name; }
    public List<PointEmbeddable> getPoints() { return points; }
}