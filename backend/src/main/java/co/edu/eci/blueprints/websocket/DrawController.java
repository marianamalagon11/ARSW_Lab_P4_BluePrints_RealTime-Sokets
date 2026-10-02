package co.edu.eci.blueprints.websocket;

import co.edu.eci.blueprints.model.Point;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

@Controller
public class DrawController {

    private final SimpMessagingTemplate messagingTemplate;

    public DrawController(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @MessageMapping("/draw")
    public void draw(DrawMessage message) {
        String destination = "/topic/blueprints.%s.%s".formatted(message.author(), message.name());
        messagingTemplate.convertAndSend(destination, message);
    }

    public record DrawMessage(String author, String name, Point point) { }
}
