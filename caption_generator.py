import random

def generate_caption():
    cat_captions = [
        "Pure joy", "Cat life", "Stay pawsitive", "Meow moment", "Stay fuzzy",
        "Fur baby", "Purrfect view", "Stay cozy", "Sweet kitty", "Cat nap",
        "Little lion", "Mood always", "Soft paws", "Whiskers Wednesday", "Peak cozy",
        "Totally obsessed", "Simply cute", "Daily dose", "Meow magic", "Kitty love",
        "Tail wags", "Furry friend", "Staying pawsome", "Golden hour", "Best bud",
        "Wild child", "Heart melter", "Cuddle bug", "Lazy days", "Too cute",
        "Cat vibe", "Always sleepy", "Purr machine", "Little explorer", "Dream big",
        "Simply purrfect", "Main character", "Fluff ball", "Tiny hunter", "Vibe check",
        "Maximum fluff", "So soft", "Mischief maker", "Current mood", "Sweet dreams",
        "Paws up", "Just chilling", "Cat logic", "Home buddy", "Stay curious",
        "Happy kitty", "Feline fine", "Eye contact", "Double trouble", "Pure fluff",
        "Living large", "Small fry", "Cloud nine", "Snack time", "Playful soul",
        "Big energy", "Spirit animal", "Cuteness overload", "Iconic energy", "Zero thoughts",
        "Zoomies time", "Floof alert", "Staring contest", "Sun bather", "Nap queen",
        "Nap king", "Stay wild", "Morning ritual", "Graceful hunter", "Gentle giant",
        "Tiny beans", "Toe beans", "Sassy soul", "Truly blessed", "My muse",
        "Cat energy", "Perfect timing", "Loaf mode", "Standard procedure", "Simply iconic",
        "Furry chaos", "Weekend vibes", "Quiet moments", "Little shadow", "Always watching",
        "Pure bliss", "Life partner", "Best view", "Total sweetheart", "Completely relaxed",
        "High alert", "Natural beauty", "Living fancy", "Pet therapy", "Unconditional love"
    ]
    random_selection = random.sample(cat_captions, 5)
    return random_selection
